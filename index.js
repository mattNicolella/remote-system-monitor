const { app, Menu, Tray, BrowserWindow, shell, ipcMain } = require('electron');
const { exec, execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const serverConfig = 'serverConfig.json';

let serverSettings = {
    serverPort: 82,
    host: 'localhost',
    protocol: 'http'
};

const loadConfig = () => {
    if(fs.existsSync(serverConfig)) {
        console.log('Config Loaded.');
        const data = fs.readFileSync(serverConfig);
        let settings = JSON.parse(data);

        console.log(settings);

        if(typeof settings.host !== 'undefined' && settings.host) {
            serverSettings.host = settings.host;
        }

        if(typeof settings.serverPort !== 'undefined' && settings.serverPort) {
            serverSettings.serverPort = settings.serverPort;
        }

        if(typeof settings.protocol !== 'undefined' && settings.protocol) {
            serverSettings.protocol = settings.protocol;
        }
    } else {
        console.log('No Config Loaded, Using Defaults.');
    }
};

const getHostname = () => {
    return `${serverSettings.protocol}://${serverSettings.host}:${serverSettings.port}`;
};

loadConfig();

const frameOptions = {
    width: 800,
    height: 600,
    menuBarVisible: false,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js')
    }
};

let tray = null;
app.whenReady().then(() => {
    tray = new Tray(path.join(__dirname, '/lineGraph.jpg'))
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Monitor In Browser', click: async () => {
                shell.openExternal(`${getHostname()}/viewer`)
            }
        },
        {
            label: 'Open Monitor Borderless', click: async () => {
                buildWindow(`${getHostname()}/viewer`);
            }
        },
        {
            label: 'settings', click: async () => {
                buildWindow(`${getHostname()}/settings`);
            }
        },
        {
            label: 'Quit', click: async () => {
                app.quit();
                cleanExit();
            }
        }
    ])

    tray.setToolTip('System Usage Reporting Server');
    tray.setContextMenu(contextMenu);
});

function buildWindow(script) {
    const win = new BrowserWindow(frameOptions);

    win.loadURL(script);
    win.on('close', function (evt) {
        evt.preventDefault();
        win.hide();
        win.removeAllListeners();
    });

    //win.webContents.openDevTools();
    win.on('maximize', () => {
        win.webContents.send('minMax', {req: win.isMaximized()});
    });
    win.on('unmaximize', () => {
        win.webContents.send('minMax', {req: win.isMaximized()});
    });
}

ipcMain.on('windowAction', (event, obj) => {
    //console.log(event);
    //let win = BrowserWindow.fromId(event.frameId);  //thing is a chode. DO NOT USE
    /*if(win === null) {
        console.log('attemtipt from we contents')
        win = BrowserWindow.fromWebContents(event.sender);
    }*/

    const win = BrowserWindow.fromWebContents(event.sender);

    switch(obj.action) {
        case 'minimize':
            win.minimize();
        break;
        
        case 'maximize':
            win.maximize();
        break;

        case 'restore':
            win.unmaximize();
        break;

        case 'close':
            win.close();
        break;

    }
});

const express = require('express');
const webServer = express();
const bodyParser = require('body-parser');

webServer.set('views', __dirname + '/views');
webServer.set('view engine', 'ejs');

var urlencodedParser = bodyParser.urlencoded({ extended: false });

webServer.all('*', urlencodedParser, function(req, res, next) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || "*");
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'content-Type,x-requested-with');
    next();
});

let systemInfo = {
    hasUpdated: false
};

//const script = `start systemMonitor.exe`,
const script = `./utilization.ps1`,
    options = {
        shell:'powershell',
        windowsHide:true
    };

const monitors = {
    cpu: null,
    ram: null,
    disk: null,
};

const monitorTimers = [];

startMonitors();

const jsonApiBase = '/api/json/v1';

webServer.get('/', (req, res) => {
    //res.sendFile(path.join(__dirname, '/index.html'));
    res.render("pages/viewer");
});

webServer.get('/test', (req, res) => {
    // here you render `orders` template
    test = {
        hello: {
            a: 1,
            b: 2,
            c: 3
        },
        nello: [1,2,3,54]
    };

    res.render("pages/orders", {orders: test});
});

webServer.get('/settings', (req, res) => {    
    if(!fs.existsSync(serverConfig)) {
        fs.writeFileSync(serverConfig, '');
    }

    let data = fs.readFileSync(serverConfig);
    if(data) {
        try {
            data = JSON.parse(data);
            for(const item in data) {
                if(typeof serverSettings[item] !== 'undefined') {
                    serverSettings[item] = data[item];
                }
            }
        } catch(e) {
            console.log('hello');
        }
    }

    res.render("pages/settings", {serverSettings});
});

webServer.post('/saveSettings', (req, res) => {
    fs.writeFileSync(serverConfig, JSON.stringify(req.body));
    loadConfig();
});

if(true) { //doing this to scope some variables
    monitorType = 'all';
    webServer.get(`${jsonApiBase}/system/${monitorType}`, (req, res) => {
        systemInfo.lastUpdated = Date.now();
        res.send(systemInfo);
    });

    webServer.get(`${jsonApiBase}/status/${monitorType}`, (req, res) => {
        let output = {};
        for(const monitorName in monitors) {
            output[monitorName] = monitors[monitorName].exitCode;
        }

        console.log(output);
        res.send(output);
    });

    webServer.get(`${jsonApiBase}/stop/${monitorType}`, (req, res) => {
        cleanExit(false);

        const output = {
            monitorType,
            result: 'stopped'
        };

        console.log(output);
        res.send(output);
    });

    webServer.get(`${jsonApiBase}/start/${monitorType}`, (req, res) => {
        startMonitors();

        const output = {
            monitorType,
            result: 'started'
        };

        console.log(output);
        res.send(output);
    });

    webServer.get(`${jsonApiBase}/restart/${monitorType}`, (req, res) => {
        cleanExit(false);
        startMonitors();

        const output = {
            monitorType,
            result: 'restarted'
        };

        console.log(output);
        res.send(output);
    });
}

for(const monitorType in monitors) {
    webServer.get(`${jsonApiBase}/system/${monitorType}`, (req, res) => {
        res.send(systemInfo[monitorType]);
    });

    webServer.get(`${jsonApiBase}/status/${monitorType}`, (req, res) => {
        let output = {};
        output[monitorType] = monitors[monitorType].exitCode;

        console.log(output);
        res.send(output);
    });

    webServer.get(`${jsonApiBase}/stop/${monitorType}`, (req, res) => {
        killMonitor(monitorType);

        const output = {
            monitorType,
            result: 'stopped'
        };

        console.log(output);
        res.send(output);
    });

    webServer.get(`${jsonApiBase}/start/${monitorType}`, (req, res) => {
        startMonitor(monitorType);

        const output = {
            monitorType,
            result: 'started'
        };

        console.log(output);
        res.send(output);
    });

    webServer.get(`${jsonApiBase}/restart/${monitorType}`, (req, res) => {
        killMonitor(monitorType);
        startMonitor();

        const output = {
            monitorType,
            result: 'restarted'
        };

        console.log(output);
        res.send(output);
    });
}

webServer.get('/viewer', (req, res) => {
    res.render('pages/viewer');
});

const staticFolders = [
    'js',
    'css',
    'fonts',
    'icons'
];

for(const folder of staticFolders) {
    webServer.use(express.static(folder));
}

process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill

function startMonitors() {
    for(const monitorType in monitors) {
        startMonitor(monitorType);
    }
}

function startMonitor(monitorType) {
    if(monitors[monitorType] == null) {
        monitors[monitorType] = exec(`${script} ${monitorType}`, options);
    }

    let monitor = monitors[monitorType];

    if(typeof systemInfo[monitorType] === 'undefined') {
        systemInfo[monitorType] = {};
    }

    let outputBuffer = [];

    if(typeof monitorTimers[monitorType] === 'undefined')
        monitorTimers[monitorType] = null;

    monitor.stdout.setEncoding('utf8');
    monitor.stdout.on('data', data => {

        clearTimeout(monitorTimers[monitorType]);
        monitorTimers[monitorType] = setTimeout(() => {
            console.log('Monitor ', monitorType, ' timed out. Restarting.');

            killMonitor(monitorType);
            startMonitor(monitorType);
        }, 1 * 60 * 1000);

        let submitting = false;
        let formatted = data.trim().replaceAll('\r\n', '').replaceAll("  ", "");

        if(!data)
            return;

        if(formatted.endsWith('<>||<>')) {
            formatted = formatted.replaceAll("<>||<>", "");
            submitting = true;
        }

        outputBuffer.push(formatted);

        if(submitting) {
            const final = outputBuffer.join("").trim();
            outputBuffer = [];

            if(final) {
                try {
                    systemInfo[monitorType] = JSON.parse(final);
                    systemInfo[monitorType].lastUpdated = Date.now();
                    systemInfo[monitorType].running = true;
                } catch(e) {
                    //console.log(e);
                    console.error('Error |', final, '|', typeof final);
                }
            }
        }
    });
}

function cleanExit(withFinal = true) {
    for(const monitorType in monitors) {
        killMonitor(monitorType);
    }

    if(withFinal) {
        process.exit();
    }
}

function killMonitor(monitorType) {
    if(!monitors[monitorType].killed)
        console.log(execSync(`powershell taskkill /F /pid ${monitors[monitorType].pid}`, options).toString());

    monitors[monitorType].kill();

    monitors[monitorType] = null;
    systemInfo[monitorType].running = false;
    clearTimeout(monitorTimers[monitorType]);
}

webServer.listen(serverSettings.serverPort, () => {
    console.log(`System Usage Report listening on port ${serverSettings.serverPort}`);
});