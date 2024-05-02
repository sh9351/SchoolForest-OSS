const sessions = new Map()
const fs = require('fs').promises
const { join } = require('path')
const { scrypt, randomBytes } = require('crypto')

sessions.set('admin', {
    info: {
        "school": {
            "kraOrgNm": "[REDACTED]",
            "zipAdres": "[REDACTED]",
            "orgCode": "[REDACTED]",
            "schulCrseScCode": "[REDACTED]",
            "schulKndScCode": "[REDACTED]",
            "atptOfcdcScCode": "[REDACTED]"
        },
        "id": "sh9351",
        "name": "임세훈",
        "birthday": "[REDACTED]",
        "grade": "[REDACTED]",
        "class": "[REDACTED]",
        "usageRestricted": false,
        "stdntPNo": "[REDACTED]",
        "parentalVerification": {
            "verified": true
        }
    }
})

module.exports = {
    user: {
        middleware: (req, res, next) => {
            sessions.forEach((v, k) => v.expire < new Date().getTime() && sessions.delete(k))
            const user = sessions.get(req.cookies?.token)?.info
            req.user = user
            req.require = () => {
                if (!user) {
                    res.redirect('/login')
                    return true
                } else if (!req.user.parentalVerification.verified && !(req.path.startsWith('/api/') && req.method === 'POST')) {
                    res.status(200).sendFile('verify.html', {
                        root: join(__dirname, '../src')
                    })
                    return true
                }
                else return false
            }
            next()
        },
        signup: user => new Promise(async (resolve, reject) => {
            const users = JSON.parse(await fs.readFile('./database/users/users.json').catch(reject))
            const { info, password, } = user
            if (users[info.name + info.birthday]) {
                reject('이미 해당 정보로 등록된 계정이 존재해요.')
                return
            }
            fs.access('./database/users/' + info.id + '.json', 0).then(() => reject('이미 해당 아이디로 등록된 계정이 존재해요.')).catch(() => {
                const salt = randomBytes(8).toString('base64')
                scrypt(password, salt, 64, {}, (err, password) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    users[info.name + info.birthday] = info.id
                    fs.writeFile('./database/users/' + info.id + '.json', JSON.stringify({
                        info,
                        password: password.toString('base64'),
                        salt
                    })).then(() => fs.writeFile('./database/users/users.json', JSON.stringify(users)).then(() => fs.access('./database/board/' + info.school.orgCode + '.json', 0).then(resolve).catch(fs.writeFile('./board/' + info.school.orgCode + '.json', '{}').then(resolve).catch(reject))).catch(reject)).catch(reject)
                })
            })
        }),
        login: (name, birthday, inpassword) => new Promise((resolve, reject) => fs.readFile('./database/users/users.json').then(data => {
            const json = JSON.parse(data)
            const id = json[name + birthday]
            if (!id) {
                reject('해당 사용자 정보로 사용자를 찾을 수 없어요.')
                return
            }
            fs.readFile('./database/users/' + id + '.json').then(data => {
                const user = JSON.parse(data)
                const { info, password, salt } = user
                scrypt(inpassword, salt, 64, {}, (err, hashedpassword) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (password.toString('base64') == hashedpassword.toString('base64')) {
                        const cookie = randomBytes(64).toString('base64')
                        sessions.set(cookie, {
                            info,
                            expire: new Date().getTime() + 1000 * 60 * 60 * 24
                        })
                        resolve({
                            cookie
                        })
                    }
                    else reject('비밀번호를 다시 확인해 주세요.')
                })
            }).catch(reject)
        }).catch(reject)),
        logout: id => new Promise(resolve => {
            sessions.forEach((v, k) => (v.info.id == id) && sessions.delete(k))
            resolve()
        }),
        editProperties: (user, changes) => new Promise((resolve, reject) => fs.readFile('./database/users/' + user.id + '.json').then(data => {
            const json = JSON.parse(data)
            const keys = Object.keys(changes)
            sessions.forEach(value => value.info.id == user.id && keys.forEach(k => value.info[k] = changes[k]))
            keys.forEach(k => json.info[k] = changes[k])
            fs.writeFile('./database/users/' + user.id + '.json', JSON.stringify(json)).then(resolve).catch(reject)
        }).catch(reject)),
        read: id => fs.readFile('./database/users/' + id + '.json')
    },
    board: {
        read: user => fs.readFile('./database/board/' + user.school.orgCode + '.json', 'utf-8'),
        new: (user, board) => new Promise((resolve, reject) => {
            fs.readFile('./database/board/' + user.school.orgCode + '.json').then(data => {
                const json = JSON.parse(data)
                if (json[board]) {
                    reject('이미 생성된 게시판이에요.')
                    return
                }
                json[board] = {
                    author: user.id,
                    articles: [],
                    time: new Date().getTime()
                }
                fs.writeFile('./database/board/' + user.school.orgCode + '.json', JSON.stringify(json)).then(resolve).catch(reject)
            })
        }),
        write: (user, board, title, text) => new Promise((resolve, reject) => fs.readFile('./database/board/' + user.school.orgCode + '.json').then(data => {
            const json = JSON.parse(data)
            if (!json[board]) {
                reject('존재하지 않는 게시판이에요.')
                return
            }
            const id = Math.random().toString(36).substring(2)
            json[board].articles.unshift({
                title,
                text,
                author: user.id,
                time: new Date().getTime(),
                id,
                comments: []
            })
            fs.writeFile('./database/board/' + user.school.orgCode + '.json', JSON.stringify(json)).then(() => resolve(id)).catch(reject)
        })),
        comment: (user, board, id, text) => new Promise((resolve, reject) => {
            fs.readFile('./database/board/' + user.school.orgCode + '.json').then(data => {
                const json = JSON.parse(data)
                if (!json[board]) {
                    reject('존재하지 않는 게시판이에요.')
                    return
                }
                json[board].articles.filter(i => i.id == id)[0].comments.unshift({
                    text,
                    author: user.id,
                    time: new Date().getTime()
                })
                fs.writeFile('./database/board/' + user.school.orgCode + '.json', JSON.stringify(json)).then(resolve).catch(reject)
            }).catch(reject)
        })
    }
}