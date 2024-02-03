/**
 * This script automates the release process of a progressive web application via sftp.
 * 
 * To use this script:
 * 
 * 1. Install the necessary dependencies by running `npm install` in the terminal.
 * 2. Run the script with `node pipeline.js`. This will start the release process.
 * 3. If you want to release to production, add the `-production` or `-p` flag.
 * 4. Use `-help` or `-h` to display more command line options.
 * 
 * Please ensure that you have the necessary permissions to read from and write to the specified directories and files,
 * and to connect to the SFTP server.
 */

const startTime = new Date();

const fs = require('fs');
const { promises: fsPromises, statSync } = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const chalk = require('chalk');
const SftpClient = require('ssh2-sftp-client');
const UglifyJS = require("uglify-js");
const CleanCSS = require('clean-css');

const ignoredFileTypes = ['.zip', '.rar', '.md', '.txt', '.psd'];
const directoriesToInclude = ['./src', './img', './fonts'];
let filesToCache = [
    'service-worker.js',
    'service-worker-registration.js',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'index.html',
    'friendship-style.css',
    'chillout-style.css',
    'housebird-style.css',
    'minimalistic-style.css',
    'nothing-style.css',
    'retro-style.css',
    'void-style.css',
    'style.css',
];
const htaccessFile = '.htaccess';
const cacheFile = './filesToCache.js';
const applicationPaths = {
    production: 'housebird_games/calculator',
    staging: 'calculator-staging'
};
const statisticsFileName = 'pipeline-log.txt';
const minifiedDirectory = 'minified';

const productionFlag = process.argv.includes('-production') || process.argv.includes('-p');
const stagingFlag = process.argv.includes('-staging') || process.argv.includes('-s');
const cacheFlag = process.argv.includes('-cache') || process.argv.includes('-c');
const rollbackFlag = process.argv.includes('-rollback') || process.argv.includes('-r');
const backupFlag = process.argv.includes('-backup') || process.argv.includes('-b');
const deleteFlag = process.argv.includes('-delete') || process.argv.includes('-d');
const versionFlagIndex = process.argv.findIndex(arg => arg === '-version' || arg === '-v');
const helpFlag = process.argv.includes('-help') || process.argv.includes('-h');
const infoFlag = process.argv.includes('-info') || process.argv.includes('-i');
const minifyFlag = process.argv.includes('-minify') || process.argv.includes('-m');
const disableStatisticsFlag = process.argv.includes('-nolog') || process.argv.includes('-nl');
const fileTypeCounts = {};
let fileTypeSizes = {};

function help() {
    if (helpFlag || process.argv.length === 2) {
        console.log(`        Usage: node pipeline.js [options]
    
        Options:
        -v, -version <version>  Set the version number. Expected format is x, x.x, x.x.x, or x.x.x.x
        -v, -version            Increment the last part of the version number by 1
        -h, -help or [no flag]  Display this help message and exit
        -i, -info               Display detailed information about the process
        -c, -cache              (Re-)Generates the filesToCache.js file
        -d, -delete <-p|-s>     Deletes the application production or staging directory from the server
        -b, -backup             Creates a backup before deploying the new version that can be rolled back to.
        -r, -rollback           Rollback to the backup version, if on server (used with -p or -s)
        -nl, -nolog             No statistics logged and added to the log file
        -m, -minify             Minifies the files in filesToCache.js (before uploading them to the server)
        -p, -production         Release to production
        -s, -staging            Release to staging (is ignored if -p is set)
        `);
        process.exit(0);
    }
}

async function main() {
    help();

    console.log('');

    const applicationPath = getApplicationPath();
    if (productionFlag || stagingFlag) {
        console.log(chalk.green(`Starting ${productionFlag ? 'production' : 'staging'} ${deleteFlag ? 'deletion' : 'release'} process to ${applicationPath}...`));
    }

    const currentVersion = await getCurrentVersion();
    let version = currentVersion;
    console.log(`Current version: ${currentVersion}`);

    if (versionFlagIndex !== -1) {
        const newVersion = getNewVersion(currentVersion);
        version = newVersion;
        await updateVersion(newVersion);
    }

    const filesToCache = await getFilesToCache();

    information(filesToCache);

    const cacheSize = await writeFilesToCacheFile(filesToCache);

    let minifiedSize = '';
    if (!deleteFlag) {
        minifiedSize = await minifyFiles(filesToCache);
    }

    let filesUploaded = null;
    if (rollbackFlag) {
        await rollback(applicationPath);
    }
    else if (deleteFlag) {
        await deleteDirectoryFromServer(applicationPath);
    }
    else {
        filesUploaded = await uploadFilesToServer(filesToCache, applicationPath) | 0;
    }

    console.log('');
    if ((productionFlag || stagingFlag) && !deleteFlag && !rollbackFlag) {
        console.log(chalk.green(`Release process of version ${version} completed successfully.`));
    }
    else {
        console.log(chalk.green('Done.'));
    }

    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = ((elapsedTime % 60000) / 1000).toFixed(0);

    console.log(chalk.gray(`Elapsed time: ${minutes}:${seconds} minutes`));

    await addStatistics(`${minutes}:${seconds} minutes`, version, filesUploaded, filesToCache.length, cacheSize, minifiedSize);

    console.log('');
}

function information(filesToCache) {
    if (infoFlag) {
        console.log('');
        console.log(chalk.green(`Information:`));
        console.log('');
        console.log(`    Production path: ${applicationPaths.production}`);
        console.log(`    Staging path: ${applicationPaths.staging}`);
        console.log('');
        console.log(chalk.yellow(`    Included ${filesToCache.length} files`));

        console.log('');
        for (const fileType in fileTypeCounts) {
            console.log(chalk.gray(`    ${fileType ? fileType : 'NO EXT'}: ${fileTypeCounts[fileType]}x${fileTypeSizes[fileType] ? ` > ${(fileTypeSizes[fileType] / 1048576).toFixed(2)} MB` : ''}`));
        }
    }
}

async function minifyFiles(filesToCache) {
    if (!minifyFlag) return null;

    console.log('');
    console.log(chalk.gray(`Minifying ${filesToCache.length} files...`));

    await fsPromises.mkdir(minifiedDirectory, { recursive: true });

    let oldTotalSize = 0;
    let totalSize = 0;

    const bar = new ProgressBar('    Minifying files [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 24,
        total: filesToCache.length
    });

    for (const file of filesToCache) {
        const outputPath = path.join(minifiedDirectory, path.basename(file));
        const originalStats = await fsPromises.stat(file);
        const originalSizeKB = (originalStats.size / 1024).toFixed(2);
        oldTotalSize += originalStats.size;

        if (file.endsWith('.js')) {
            const fileContent = await fsPromises.readFile(file, 'utf8');
            const result = UglifyJS.minify(fileContent);
            if (result.error) throw result.error;
            await fsPromises.writeFile(outputPath, result.code, 'utf8');
        } else if (file.endsWith('.css')) {
            const fileContent = await fsPromises.readFile(file, 'utf8');
            const result = new CleanCSS({}).minify(fileContent);
            if (result.errors.length > 0) throw result.errors;
            await fsPromises.writeFile(outputPath, result.styles, 'utf8');
        }
        else {
            if (!infoFlag) bar.tick();
            continue;
        }

        const minifiedStats = await fsPromises.stat(outputPath);
        totalSize += minifiedStats.size;

        if (infoFlag) {
            console.log(chalk.gray(`    Minified ${path.basename(file)}: ${originalSizeKB} KB > ${(minifiedStats.size / 1024).toFixed(2)} KB`));
        }
        else {
            bar.tick();
        }
    }

    if (infoFlag) {
        bar.tick(filesToCache.length);
    }

    const oldFileSize = (oldTotalSize / 1048576).toFixed(2);
    const newFileSize = (totalSize / 1048576).toFixed(2);

    console.log('');
    console.log(`Total minified size: ${oldFileSize} MB > ${newFileSize} MB`);

    return newFileSize;
}

async function addStatistics(time, version, uploadedFiles, cachedFiles, cacheFileSize, minifiedSize) {
    if (disableStatisticsFlag) return;

    let currentTime = new Date();
    currentTime = currentTime.toLocaleString('en-GB').replace(',', '');
    const scriptArguments = process.argv
        .slice(2)
        .map(arg => path.basename(arg))
        .join(' ');
    const statistics = `Version:         ${version}\nFinished:        ${currentTime}\nArguments:       ${scriptArguments}\nProcess Time:    ${time}\nUploaded files:  ${uploadedFiles ? uploadedFiles : '0'}\nCached files:    ${cachedFiles}\nCache file size: ${(cacheFileSize / 1048576).toFixed(2)} MB${minifiedSize ? `\nMinified size:   ${minifiedSize} MB` : ''}\n\n`;

    try {
        const data = await fsPromises.readFile(statisticsFileName, 'utf8');
        await fsPromises.writeFile(statisticsFileName, statistics + (data || ''), 'utf8');
        console.log(chalk.gray('Statistics saved'));
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist, create it with the new data
            try {
                await fsPromises.writeFile(statisticsFileName, statistics, 'utf8');
                console.log(chalk.green(`Statistics file created: ${statisticsFileName} and statistics saved`));
            } catch (writeError) {
                console.error(`Error creating file: ${writeError}`);
            }
        } else {
            console.error(`Error: ${error}`);
        }
    }
}

async function getCurrentVersion() {
    const data = await fsPromises.readFile(path.join(__dirname, 'service-worker.js'), 'utf8');
    const versionMatch = data.match(/self.CACHE_VERSION = '(.*?)';/);
    if (!versionMatch) throw new Error('Could not find CACHE_VERSION in service-worker.js');
    return versionMatch[1];
}

function getNewVersion(currentVersion) {
    if (versionFlagIndex !== -1) {
        let newVersion = process.argv[versionFlagIndex + 1];
        if (newVersion === undefined || newVersion.startsWith('-')) {
            const versionParts = currentVersion.split('.');
            versionParts[3] = (parseInt(versionParts[3], 10) + 1).toString();
            return versionParts.join('.');
        } else if (!/^\d+(\.\d+){0,3}$/.test(newVersion)) {
            throw new Error('Invalid version number format. Expected format is x, x.x, x.x.x, or x.x.x.x');
        } else {
            const versionParts = newVersion.split('.');
            while (versionParts.length < 4) {
                versionParts.push('0');
            }
            return versionParts.join('.');
        }
    }

    return currentVersion;
}

async function updateVersion(newVersion) {
    const serviceWorkerPath = path.join(__dirname, 'service-worker.js');
    let data = await fsPromises.readFile(serviceWorkerPath, 'utf8');
    data = data.replace(/self.CACHE_VERSION = '(.*?)';/, `self.CACHE_VERSION = '${newVersion}';`);
    await fsPromises.writeFile(serviceWorkerPath, data, 'utf8');
    console.log(chalk.blue(`Service worker version updated to: ${newVersion}`));

    const indexPath = path.join(__dirname, 'index.html');
    data = await fsPromises.readFile(indexPath, 'utf8');
    data = data.replace(/<p id="versionText">Version (.*?)<\/p>/, `<p id="versionText">Version ${newVersion}</p>`);
    await fsPromises.writeFile(indexPath, data, 'utf8');
    console.log(chalk.blue(`Index.html version updated to: ${newVersion}`));
}

async function getFilesToCache() {
    if (infoFlag) {
        console.log(chalk.gray(`Reading files from root folder...`));
        filesToCache.forEach(element => {
            console.log(chalk.gray(`    ${element}`));
        });
    }

    for (const dir of directoriesToInclude) {
        if (dir == './uploads' || dir == './img/screenshots') continue;
        infoFlag && console.log(chalk.gray(`Reading files from ${dir}...`));
        await readFilesFromDirectory(dir, filesToCache);
    }

    return [...new Set(filesToCache)].sort();
}

async function readFilesFromDirectory(directory, filesToCache) {
    const filesInDirectory = await fsPromises.readdir(directory);
    for (const file of filesInDirectory) {
        const fullPath = path.join(directory, file);
        const stats = await fsPromises.stat(fullPath);
        if (stats.isDirectory()) {
            await readFilesFromDirectory(fullPath, filesToCache);
        } else {
            const fileType = path.extname(file);
            if (!ignoredFileTypes.includes(fileType)) {
                filesToCache.push(fullPath.replace(/\//g, '/'));
                fileTypeCounts[fileType] = (fileTypeCounts[fileType] || 0) + 1;
                fileTypeSizes[fileType] = (fileTypeSizes[fileType] || 0) + stats.size;
            }
        }
    }
}

async function writeFilesToCacheFile(filesToCache) {

    let totalSize = 0;
    filesToCache.forEach(file => {
        const stats = statSync(path.join(__dirname, file));
        totalSize += stats.size;
    });

    if (!cacheFlag) return totalSize;
    console.log('');

    console.log(chalk.gray(`Writing ${filesToCache.length} files to ${cacheFile}...`));

    let fileContent = 'self.filesToCache = [\n';
    fileContent += filesToCache.map(f => `'/calculator/${f}',`.replace(/\\/g, '/')).join('\n');
    fileContent += '\n];';
    await fsPromises.writeFile(cacheFile, fileContent, 'utf8');

    console.log(chalk.yellow(`Wrote ${filesToCache.length} files (total size: ${(totalSize / 1048576).toFixed(2)} MB) to ${cacheFile}.`));

    return totalSize;
}

async function uploadFilesToServer(filesToCache, applicationPath) {
    if (!productionFlag && !stagingFlag) return;

    let filesToUpload = [...filesToCache, 'filesToCache.js'];

    filesToUpload.sort((a, b) => {
        if (path.basename(a) === 'service-worker.js') return 1;
        if (path.basename(b) === 'service-worker.js') return -1;
        return 0;
    });

    console.log('');
    console.log(chalk.grey(`Uploading ${filesToUpload.length} files to server:`))

    const sftpConfig = require('./sftp-config.js');
    const sftp = new SftpClient();
    sftp.client.setMaxListeners((filesToUpload.length + 1));

    try {
        console.log(chalk.blue('    Attempting to connect to SFTP server...'));
        await sftp.connect(sftpConfig);
        console.log(chalk.green('    Successfully connected to SFTP server.'));

        console.log(chalk.blue('    Uploading files to server...'));
        await uploadFiles(filesToUpload, sftp, applicationPath);
        console.log(chalk.green('    Files successfully uploaded.'));
    } catch (error) {
        const endTime = new Date();
        const elapsedTime = endTime - startTime;
        console.error(`Error: ${error.message}. Elapsed time: ${elapsedTime} ms.`);
        return 0;
    } finally {
        console.log(chalk.blue('    Closing SFTP connection...'));
        await sftp.end();
        console.log(chalk.green('    SFTP connection closed.'));
    }
    console.log(chalk.gray('Upload complete.'));
    return filesToUpload.length;
}

async function createDirectoriesOnServer(filesToUpload, sftp, applicationPath) {
    applicationPath = `${applicationPath}`;
    const directories = Array.from(new Set(filesToUpload.map(file => path.dirname(file).replace(/\\/g, '/'))));
    directories.sort((a, b) => a.split('/').length - b.split('/').length);

    const dirBar = new ProgressBar('    Creating directories [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 24,
        total: directories.length - 1
    });

    for (const dir of directories) {
        if (dir === '.') continue;
        infoFlag && console.log(chalk.gray(`    Creating directory: ${dir}`));

        const remoteDir = `/${applicationPath}/` + (dir.startsWith('./') ? dir.slice(2) : dir);
        await sftp.mkdir(remoteDir, true);

        infoFlag || dirBar.tick();
    }
    infoFlag && dirBar.tick(directories.length - 1);
}

async function uploadFilesToDirectory(filesToUpload, sftp, applicationPath) {
    const uploadBar = new ProgressBar('    Uploading files [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 24,
        total: filesToUpload.length
    });

    await Promise.all(filesToUpload.map(async (file) => {
        infoFlag && console.log(chalk.gray(`    Uploading: ${file}`));

        const relativeFilePath = file.replace(/^\.\/|^\//, '');
        const remotePath = `/${applicationPath}/${relativeFilePath.replace(/\\/g, '/')}`;

        const minifiedFilePath = path.join(minifiedDirectory, path.basename(file));
        const localFilePath = fs.existsSync(minifiedFilePath) && minifyFlag ? minifiedFilePath : path.join(__dirname, file);

        await sftp.fastPut(localFilePath, remotePath);
        uploadBar.tick();
    }));

    await sftp.fastPut(htaccessFile, `/${applicationPath}/.htaccess`);
}

async function uploadFiles(filesToUpload, sftp, applicationPath) {
    const backupApplicationPath = `${applicationPath}_BACKUP`;

    if (backupFlag && await sftp.exists(backupApplicationPath)) {
        console.log(chalk.blue('    Starting Backup...'))
        await deleteDirectory(sftp, backupApplicationPath);
    }


    if (backupFlag) {
        await sftp.mkdir(backupApplicationPath);
        await copyDirectory(sftp, applicationPath, backupApplicationPath, 'backup');
    }

    await createDirectoriesOnServer(filesToUpload, sftp, applicationPath);
    await uploadFilesToDirectory(filesToUpload, sftp, applicationPath);
}

async function copyDirectory(sftp, src, dest, tempFolderName = 'temp') {
    const projectTempDir = path.join(__dirname, tempFolderName);
    console.log(chalk.gray(`    Copying ${src} to ${dest}...`));

    if (fs.existsSync(projectTempDir)) {
        fs.rmSync(projectTempDir, { recursive: true, force: true });
    }

    console.log(chalk.gray(`    Downloading from ${src}...`));
    const downloadInterval = spinner();
    await sftp.downloadDir(src, projectTempDir);
    clearInterval(downloadInterval);
    process.stdout.write('\r');

    console.log(chalk.gray(`    Uploading to ${dest}.`));
    const uploadInterval = spinner();
    await sftp.uploadDir(projectTempDir, dest);
    clearInterval(uploadInterval);
    process.stdout.write('\r');

    console.log(chalk.gray(`    Copy completed.`));
}

async function rollback(applicationPath) {
    console.log(chalk.grey('Rolling back to backup...'));

    const backupApplicationPath = `${applicationPath}_BACKUP`;

    const sftpConfig = require('./sftp-config.js');
    const sftp = new SftpClient();

    try {
        console.log(chalk.blue('    Attempting to connect to SFTP server...'));
        await sftp.connect(sftpConfig);
        console.log(chalk.green('    Successfully connected to SFTP server.'));

        if (await sftp.exists(backupApplicationPath)) {
            sftp.client.setMaxListeners(200);


            await copyDirectory(sftp, backupApplicationPath, applicationPath);

        } else {
            console.log(chalk.red('No backup version found for rollback.'));
        }
    } catch (error) {
        console.error(chalk.red('    An error occurred:', error.message));
    } finally {
        console.log(chalk.blue('    Closing SFTP connection...'));
        await sftp.end();
        console.log(chalk.green('    SFTP connection closed.'));
    }
    console.log('');
    console.log(chalk.green('Rollback complete.'));
}

async function deleteDirectory(sftp, path) {
    try {
        console.log(chalk.gray(`    Deleting ${path}...`));
        const interval = spinner();
        await sftp.rmdir(path, true);
        clearInterval(interval);
        process.stdout.write('\r');
        console.log(chalk.gray(`    Deleted ${path}.`));
    } catch (error) {
        clearInterval(interval);
        process.stdout.write('\r');
        console.error(chalk.red(`Failed to delete ${path}:`, error));
    }
}

async function deleteDirectoryFromServer(applicationPath) {
    if (!productionFlag && !stagingFlag) {
        console.log(chalk.red('No production (-p) or staging flag (-s) set. Aborting deletion.'))
        return;
    }
    else if (!deleteFlag) {
        console.log(chalk.red('No delete flag (-d) set. Aborting deletion.'))
        return;
    }

    console.log('');
    console.log(chalk.grey('Deleting directory from server:'))

    const sftpConfig = require('./sftp-config.js');
    const sftp = new SftpClient();

    try {
        console.log(chalk.blue('    Attempting to connect to SFTP server...'));
        await sftp.connect(sftpConfig);
        console.log(chalk.green('    Successfully connected to SFTP server.'));

        console.log(chalk.blue('    Deleting directory from server...'));

        const interval = spinner();

        await sftp.rmdir(applicationPath, true);

        clearInterval(interval);
        process.stdout.write('\r');
        console.log(chalk.green('    Directory successfully deleted.'));
    } catch (error) {
        clearInterval(interval);
        process.stdout.write('\r');
        console.error(chalk.red('    An error occurred:', error.message));
    } finally {
        console.log(chalk.blue('    Closing SFTP connection...'));
        await sftp.end();
        console.log(chalk.green('    SFTP connection closed.'));
    }
    console.log(chalk.grey('Deletion complete.'));
}

function spinner() {
    const spinner = ['/', '-', '\\', '|'];
    let i = 0;
    return interval = setInterval(() => {
        process.stdout.write(`\r    ${spinner[i++ % spinner.length]}`);
    }, 250);
}

function getApplicationPath() {
    return productionFlag ? applicationPaths.production : applicationPaths.staging;
}

main().catch(err => console.error(chalk.red('An error occurred in the pipeline:', err.message)));