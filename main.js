const tcpProxy = require('node-tcp-proxy');
const onvifServer = require('./src/onvif-server');
const package = require('./package.json');
const argparse = require('argparse');
const readline = require('readline');
const stream = require('stream');
const yaml = require('yaml');
const fs = require('fs');
const simpleLogger = require('simple-node-logger');

const parser = new argparse.ArgumentParser({
    description: 'Virtual Onvif Server'
});

parser.add_argument('-v', '--version', { action: 'store_true', help: 'show the version information' });
parser.add_argument('-d', '--debug', { action: 'store_true', help: 'show onvif requests' });

let args = parser.parse_args();

if (args) {
    const logger = simpleLogger.createSimpleLogger();
    if (args.debug)
        logger.setLevel('trace');

    if (args.version) {
        logger.info('Version: ' + package.version);
        return;
    }

    // Create config from env variables
    const configData = `
onvif:
  - hostname: 0.0.0.0
    ports:
      server: ${process.env.ONVIF_PORT}
      rtsp: ${process.env.RTSP_PORT}
      snapshot: ${process.env.SNAPSHOT_PORT}
    name: Channel1
    uuid: ${process.env.STREAM_UUID}
    highQuality:
      rtsp: ${process.env.STREAM_RTSP_PATH}
      snapshot: ${process.env.STREAM_SNAPSHOT_PATH}
      width: ${process.env.STREAM_WIDTH}
      height: ${process.env.STREAM_HEIGHT}
      framerate: ${process.env.STREAM_FRAMERATE}
      bitrate: ${process.env.STREAM_BITRATE}
      quality: ${process.env.STREAM_QUALITY}
    target:
      hostname: ${process.env.STREAM_TARGET_HOST}
      ports:
        rtsp: ${process.env.STREAM_TARGET_RTSP}
        snapshot: ${process.env.STREAM_TARGET_SNAPSHOT}
    `;

    try {
        config = yaml.parse(configData);
    } catch (error) {
        logger.error('Failed to read config, invalid yaml syntax.')
        return -1;
    }

    let proxies = {};

    for (let onvifConfig of config.onvif) {
        let server = onvifServer.createServer(onvifConfig, logger);
        if (server.getHostname()) {
            logger.info(`Starting virtual onvif server for ${onvifConfig.name} on ${server.getHostname()}:${onvifConfig.ports.server} ...`);
            server.startServer();
            server.startDiscovery();
            if (args.debug)
                server.enableDebugOutput();
            logger.info('  Started!');
            logger.info('');

            if (!proxies[onvifConfig.target.hostname])
                proxies[onvifConfig.target.hostname] = {}
            
            if (onvifConfig.ports.rtsp && onvifConfig.target.ports.rtsp)
                proxies[onvifConfig.target.hostname][onvifConfig.ports.rtsp] = onvifConfig.target.ports.rtsp;
            if (onvifConfig.ports.snapshot && onvifConfig.target.ports.snapshot)
                proxies[onvifConfig.target.hostname][onvifConfig.ports.snapshot] = onvifConfig.target.ports.snapshot;
        } else {
            logger.error(`Failed to find IP address for MAC address ${onvifConfig.mac}`)
            return -1;
        }
    }
    
    for (let destinationAddress in proxies) {
        for (let sourcePort in proxies[destinationAddress]) {
            logger.info(`Starting tcp proxy from port ${sourcePort} to ${destinationAddress}:${proxies[destinationAddress][sourcePort]} ...`);
            tcpProxy.createProxy(sourcePort, destinationAddress, proxies[destinationAddress][sourcePort]);
            logger.info('  Started!');
            logger.info('');
        }
    }

    return 0;
}
