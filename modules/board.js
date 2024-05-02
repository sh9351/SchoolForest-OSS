const { board } = require('../database')
module.exports = user => new Promise((resolve, reject) => board.read(user).then(data => {
    const json = JSON.parse(data)
    resolve(Object.keys(json).map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value).slice(0, 2).map(i => ({
            title: i,
            articles: json[i].articles.sort((a, b) => b.time - a.time).slice(0, 5).map(i => ({
                title: i.title,
                time: i.time,
                author: i.author,
                id: i.id
            }))
        })))
}).catch(reject))