# Friendly Calculator

This is a simple calculator made with JavaScript. It focuses on a great user experience. It is a Progressive Web App that offers full offline support and multiple themes for personalization. You can view a deployed version here: [Friendly Calculator on housebird.games](https://housebird.games/calculator)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Node.js and npm installed on your machine. You can download Node.js [here](https://nodejs.org/en/download/) and npm is included in the installation.

## Built With

* [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
* The deployment pipeline uses [npm](https://www.npmjs.com/)

## Release Process

The `pipeline.js` script streamlines the release process. Before executing, ensure `sftp-config.js` is properly set up. It will automatically compress any images from `uncompressedDir` to the `compressedDir`.

### Steps:

Clone the repository to your local machine:

```sh    
git clone https://github.com/HousebirdGames/Friendly-Calculator.git
```

1. Run `npm install` to install the deployment pipeline dependencies.
2. Execute the script with `node pipeline.js`. This begins the release process.
3. Use the `-c` option to update the cache file list and the `-m` option to minify .js and .css files before uploading them.
4. Use `-p` to upload the web app via SFTP to production.
5. To specify a new version, use `-v` or `-version` followed by the number or without a number for an incremental version change.

Example: `node pipeline.js -c -p -v 1.2.3.4`

### Command Line Options (most can be combined):

- `-help`, `-h` or no flag: Display help message and exit. (STRONGLY RECOMMENDED to get more detailed and up to date information)
- `-production` or `-p`: Release to the production environment.
- `-staging` or `-s`: Release to the staging environment.
- `-version` or `-v`: Update the version of the `service-worker.js`.
- `-cache` or `-c`: (Re-)Generate the `filesToCache.js` file.
- `-minify` or `-m`: Minifies the files in filesToCache.js (before uploading them to the server; if not set, the original files will be uploaded).
- `-delete` or `-d`: Delete the application directory (production or staging) from the server.
- `-backup` or `-b`: Creates a backup before deploying the new version that can be rolled back to.
- `-rollback` or `-r`: Rollback to the backup version of either staging (`-s`) or production (`-p`), when available on the server.
- `-info` or `-i`: Display detailed information about the process.

The script automates various tasks, including version number updates, cache list generation, and file uploads to the server. Ensure you have the necessary permissions for file operations and SFTP server access.

### Key Features of `pipeline.js`:

- Incremental versioning control.
- Directory and file cache management.
- SFTP upload functionality.
- Support for multiple deployment paths (production/staging).
- Clean and user-friendly console interface with progress indicators and colored output.
- Command line flexibility for different deployment scenarios.
  
For more detailed usage and troubleshooting, refer to the inline comments and documentation within `pipeline.js`. Ensure to keep the script updated with any changes in project structure or deployment requirements.