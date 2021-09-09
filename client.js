const { Socket } = require('net')

/**
 * @param {number} port 
 * @param {string} host 
 * @returns {Promise<Socket>}
 */
function connect(port, host) {
    return new Promise((resolve, reject) => {
        console.log(`Connecting to ${port}`)
        const client = new Socket();
        client.on('connect', () => {
            console.log('Connected')
            process.on('SIGINT', () => {
                client.write('Disconnected!\n')
                client.destroy()
                process.exit(0)
            })
        })
            .on('ready', () => {
                process.stdin.pipe(client)
                client.pipe(process.stdout)
                resolve(client)
            })
            .on('error', reject)
            .connect({
                port,
                host,
            })
    })

}

module.exports = {
    connect,
}