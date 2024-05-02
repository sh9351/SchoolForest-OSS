const menu = require('./menu')
const school = require('./school')
const board = require('./board')
const news = require('./news')
const book = require('./book')
const schoolCache = new Map()
const bookCache = new Map()
const newsCache = new Map()
module.exports = (req, res) => {
    if (!req.user) res.status(401).end()
    else {
        const age = new Date().getFullYear() - req.user.birthday.substring(0, 4) + 1
        const { grade, class: className } = req.user
        const { atptOfcdcScCode, orgCode, kraOrgNm } = req.user.school
        Promise.allSettled([
            menu(age),
            new Promise((resolve, reject) => {
                const schoolData = schoolCache.get(orgCode)
                if (schoolData && schoolData.expire > new Date().getTime()) resolve(schoolData.data)
                else school(atptOfcdcScCode, orgCode, grade, className, kraOrgNm).then(data => {
                    schoolCache.set(orgCode, {
                        expire: new Date().getTime() + 1000 * 60 * 60,
                        data
                    })
                    resolve(data)
                }).catch(reject)
            }),
            board(req.user),
            new Promise((resolve, reject) => {
                const type = (age <= 13 ? 'primary' : (age <= 16 ? 'mid' : 'ebsi'))
                const newsData = newsCache.get(age)
                if (newsData && newsData.expire > new Date().getTime()) resolve(newsData.data)
                else news(type).then(data => {
                    newsCache.set(type, {
                        data,
                        expire: new Date().getTime() + 1000 * 60 * 60
                    })
                    resolve(data)
                }).catch(reject)
            }),
            new Promise((resolve, reject) => {
                const host = hostList[atptOfcdcScCode]
                const bookData = bookCache.get(atptOfcdcScCode)
                if (bookData && bookData.expire > new Date().getTime()) resolve({
                    data: bookData.data,
                    host
                })
                else book(host).then(data => {
                    bookCache.set(atptOfcdcScCode, {
                        data,
                        expire: new Date().getTime() + 1000 * 60 * 60
                    })
                    resolve({
                        data,
                        host
                    })
                }).catch(reject)
            }),
        ]).then(data =>res.status(200).send(data))
    }
}

const hostList = {
    'B10': 'reading.ssem.or.kr',
    'C10': 'reading.pen.go.kr',
    'D10': 'reading.edunavi.kr',
    'E10': 'book.ice.go.kr',
    'F10': 'book.gen.go.kr',
    'G10': 'reading.edurang.net',
    'H10': 'reading.ulsanedu.kr',
    'I10': 'reading.sje.go.kr',
    'J10': 'reading.gglec.go.kr',
    'K10': 'reading.gweduone.net',
    'M10': 'reading.cbe.go.kr',
    'N10': 'reading.edus.or.kr',
    'P10': 'reading.jbedu.kr',
    'Q10': 'reading.jnei.go.kr',
    'R10': 'reading.gyo6.net',
    'S10': 'reading.gne.go.kr',
    'T10': 'reading.jje.go.kr'
}