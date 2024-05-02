const pm2 = require('pm2')
pm2.connect(e => {
    if (e) throw e
    pm2.start({
        name: 'SchoolForest',
        script: 'index.js',
        instances: 'max',
        exec_mode: 'cluster',
        wait_ready: true
    }, e => {
        if (e) throw e
        else {
            console.log('SchoolForest running at port 80')
        }
    })
})