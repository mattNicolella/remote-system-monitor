function Get-CpuStats {
    $cpu = (Get-CimInstance -Class Win32_Processor)
    $tasks = New-Object System.Collections.Generic.List[Object]

    $total = 0
    $idle = 0
    Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |where {$_.PercentProcessorTime -gt 1}| select @{n="Application";e={$_.name}},@{n="CPU";e={$_.PercentProcessorTime}} | Sort-Object CPU -Descending | ForEach-Object {
        $add = $true

        if($_.Application -eq "_Total") {
            $total = $_.CPU
            $add = $false
        }

        if($_.Application -eq "Idle") {
            $add = $false
            $idle = $_.CPU
        }

        #"Task: "+$_.Application+" | CPU " + $_.CPU + " | " + $total
        if($add -eq $true) {
            $tasks.add([pscustomobject]@{
                TaskName = $_.Application
                Usage = (($_.CPU / $total) * 100).ToString("#0")
            })
        }
    }
    
    [pscustomobject]@{
        cpuUsage = $cpu.LoadPercentage.ToString("#0")
        cpuUsage2 = (100 - (($idle / $total) * 100)).ToString("#0.00")
        cpuName = $cpu.Name
        cpuCores = $cpu.NumberOfCores
        tasks = $tasks
    }

    #Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |where {$_.PercentProcessorTime -gt 1}| select @{n="Application";e={$_.name}},@{n="CPU";e={$_.PercentProcessorTime}} | Sort-Object CPU -Descending 

    #(Get-Counter '\Process(*)\% Processor Time').CounterSamples | Where-Object {$_.CookedValue -gt 5}
}

function Get-GpuStats {
    $gpu = (Get-CimInstance -Class Win32_VideoController)

    (Get-CimInstance -Class Win32_VideoController) | ForEach-Object {
        [pscustomobject]@{
            gpuName = $_.Name
            gpuVram = $_.AdapterRAM
        }
    }
}

function Get-MemoryStats {
    $totalMemory = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum).Sum
    $availMem = (Get-Counter '\Memory\Available MBytes').CounterSamples.CookedValue
    $usedMem = ($totalMemory / 1048576) - $availMem

    $tasks = New-Object System.Collections.Generic.List[Object]
    Get-CimInstance win32_process | Sort-Object -Property ws -Descending | Select-Object processname, @{Name="MemUsageMb";Expression={[math]::round($_.ws / 1mb)}}, @{Name="Datetime";Expression={get-date}} -First 100 | ForEach-Object {
        $tasks.add([pscustomobject]@{
            TaskName = $_.ProcessName
            UsageMb = $_."MemUsageMb"
        })
    }

    [pscustomobject]@{
        TotalMemory = $totalMemory
        AvailMemory = $availMem
        UsedMemory = $usedMem
        TotalMemMeg = $totalMemory / 1048576
        TotalMemGig = ($totalMemory / 1048576) /1024
        PercentUsage = (104857600 * $usedMem / $TotalMemory).ToString("#0.0")
        tasks = $tasks
    }
}

function Get-DiskStats {
    $disks = New-Object System.Collections.Generic.List[Object]

    $i = 0;
    (Get-CimInstance -Class Win32_LogicalDisk | Select-Object -Property DeviceID, VolumeName, @{Label='FreeSpace (Gb)'; expression={($_.FreeSpace/1GB).ToString('F2')}},@{Label='Total (Gb)'; expression={($_.Size/1GB).ToString('F2')}},@{label='FreePercent'; expression={[Math]::Round(($_.freespace / $_.size) * 100, 2)}}) | ForEach-Object {
        $Disk = Get-CimInstance -Class Win32_PerfRawData_PerfDisk_LogicalDisk -filter "name= '$($diskTimes[$i].DriveLetter)' "
        [Double]$Idle2 = $Disk.PercentIdleTime
        [Double]$DiskTime2 = $Disk.PercentDiskTime
        [Double]$T2 = $Disk.TimeStamp_Sys100NS

        $PercentIdleTime =[math]::Round((($Idle2 - $diskTimes[$i].IdleTime) / ($T2 - $diskTimes[$i].Time)) * 100)
        $PercentDiskTime =[math]::Round((($DiskTime2 - $diskTimes[$i].DiskTime) / ($T2 - $diskTimes[$i].Time)) * 100)

        $disks.add([pscustomobject]@{
            Name = $_.VolumeName
            TotalSize = $_."Total (Gb)"
            FreeSpace = $_."FreeSpace (Gb)"
            FreePercent = $_.FreePercent
            DriveLetter = $_.DeviceID
            DiskTime = $PercentDiskTime
            unfilteredDisk = $Disk.PercentDiskTime
            IdleTime = $PercentIdleTime
        })

        $i++
    }

    #$diskInfo = [pscustomobject]@{
    #    #PercentDiskTime = $PercentDiskTime.ToString("#0")
    #    #PercentIdleTime = $PercentIdleTime.ToString("#0")
    #    disks = $disks
    #}

    $count = 0
    $totalUsed = 0
    $totalIdle = 0
    $disks | ForEach-Object {
        $count++;
        if($_.DiskTime -le 100) {
            $totalUsed+=$_.DiskTime
        } else {
            $totalUsed+=100
        }

        if($_.IdleTime -le 100) {
            $totalIdle+=$_.IdleTime
        } else {
            $totalIdle+=100
        }
    }

    [pscustomobject]@{
        PercentDiskTime = ($totalUsed / $count).ToString("#0.00")
        PercentIdleTime = ($totalIdle / $count).ToString("#0.00")
        disks = $disks
    }

    #Get-Disk | ForEach-Object {
    #    [pscustomobject]@{
    #        Name = $_.FriendlyName
    #        TotalSize = ($_.AllocatedSize/1073741824).ToString("#0.00")
    #    }
    #}
}

$diskTimes = New-Object System.Collections.Generic.List[Object]
Get-CimInstance -Class Win32_LogicalDisk | ForEach-Object {
    $disk = Get-CimInstance -Class Win32_PerfRawData_PerfDisk_LogicalDisk -filter "name= '$($_.DeviceId)' "
    
    $diskTimes.add([pscustomobject]@{
        DriveLetter = $_.DeviceId
        DiskTime = $Disk.PercentDiskTime
        IdleTime = $Disk.PercentIdleTime
        Time = $Disk.TimeStamp_Sys100NS
    });
}

$diskTimes = $diskTimes.ToArray()

$outputType = 2

$MonitorType="all"
$showCpu = $false
$showMemory = $false
$showDisk = $false

if($args[0]) {
    $MonitorType = $args[0]
}

if($MonitorType -eq "all") {
    $showCpu = $true
    $showMemory = $true
    $showDisk = $true
}

if($MonitorType -eq "cpu") {
    $showCpu = $true
    $showMemory = $false
    $showDisk = $false
}

if($MonitorType -eq "ram") {
    $showCpu = $false
    $showMemory = $true
    $showDisk = $false
}

if($MonitorType -eq "disk") {
    $showCpu = $false
    $showMemory = $false
    $showDisk = $true
}

$spacingMS = 1000
while($true) {
    #$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $startTime = [Math]::Round((Get-Date).ToFileTimeUTC()/10000)
    $output = ""

    if($showCpu -eq $true) {
        $cpuData = (Get-CpuStats)

        if($outputType -eq 1) {
            $output += $cpuData.cpuUsage + '|*|'
        } else {
            $cpuData | ConvertTo-Json
        }
    }

    if($showMemory -eq $true) {
        $memoryData = (Get-MemoryStats)

        if($outputType -eq 1) {
            $output += $memoryData.PercentUsage + '|*|' + $memoryData.AvailMemory + '|*|' + $memoryData.UsedMemory + '|*|' + $memoryData.TotalMemMeg + '|*|'
        } else {
            $memoryData | ConvertTo-Json
        }
    }

    if($showDisk -eq $true) {
        $diskData = (Get-DiskStats)

        if($outputType -eq 1) {
            $output += $diskData.PercentDiskTime + '|*|'
        } else {
            $diskData | ConvertTo-Json
        }

        for($i = 0; $i -lt $diskTimes.length; $i++) {
            $disk = Get-CimInstance -Class Win32_PerfRawData_PerfDisk_LogicalDisk -filter "name= '$($diskTimes[$i].DriveLetter)' "

            $diskTimes[$i].DiskTime = [Double]$disk.PercentDiskTime
            $diskTimes[$i].IdleTime = [Double]$disk.PercentIdleTime
            $diskTimes[$i].Time = [Double]$disk.TimeStamp_Sys100NS
        }
    }

    $output+"<>||<>"

    $timeLeft = $spacingMs - ([Math]::Round((Get-Date).ToFileTimeUTC()/10000) - $startTime)
    if($timeLeft -gt 0) {
        Start-Sleep -Milliseconds $timeLeft
    }
}