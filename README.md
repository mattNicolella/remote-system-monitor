# Node.js Remote System Usage Monitor

## Overview

This project is a Node.js application designed to monitor and report system usage metrics from remote servers. It provides insights into CPU usage, memory consumption, disk space, and network activity, helping system administrators maintain optimal performance and diagnose potential issues.

## Features

- **Real-time Monitoring**: Get up-to-date metrics on CPU, memory, disk, and network usage.
- **Web Dashboard**: View system statistics through an intuitive web interface.

## Requirements

- Node.js (version 14.0.0 or higher)
- Express.js (for the web server)

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/mattNicolella/remote-system-monitor.git
   cd remote-system-monitor
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Run the application**:

   ```bash
   npm start
   ```

5. **Access the dashboard**:
   - Open your web browser and navigate to `http://localhost:3000` to view the dashboard.

## Usage

1. **Add Remote Servers**: Configure the servers you want to monitor in the `servers.js` file.
2. **View Metrics**: Use the dashboard to visualize system metrics in real-time.
3. **Set Alerts**: Configure alerts in the `config.js` file to get notified about critical usage levels.

## Configuration

You can customize settings such as:
- Database connection
- Alert thresholds
- Server details
in the `config.js` file.

## Contributing

Contributions are welcome! If you have suggestions or improvements, please create a pull request.

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature/YourFeature`).
6. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Thanks to the Node.js community for their support and resources!

## Contact

For questions or feedback, feel free to reach out to [your-email@example.com].
```

Feel free to modify any sections to better suit your project specifics!
