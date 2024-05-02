const { check } = require('korcen')
const { user } = require('../database')
module.exports = (currentUser, text) => new Promise((resolve, reject) => {
    if (check(text)) user.editProperties(currentUser, {
        usageRestricted: {
            type: 'filter',
            text
        }
    }).then(reject)
    else resolve()
})