const dotenv = require('dotenv')
dotenv.config()
const { user, board } = require('./database')
const { join } = require('path')
const { analyze } = require('@ko_kr/id')
const rateLimit = require('express-rate-limit')
const { neis, main, oacx, check } = require('./modules')
const root = join(__dirname, 'src')
const express = require('express')
const parser = require('cookie-parser')
const app = express()
app.disable('x-powered-by')
app.use(express.static('static'))
app.use(express.json())
app.use(parser())
app.use(user.middleware)
app.use(((req, res, next) => {
    console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path)
    next()
}))
app.use((req, res, next) => {
    if (req.user?.usageRestricted) res.status(403).send('학교숲 서비스를 사용할 수 없어요. 현재 재학중인 학교 관리자 혹은 법정대리인에게 문의해 주세요.')
    else next()
})
app.use('/api', rateLimit({
    windowMs: 1000 * 60,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: '너무 많은 요청을 시도했어요. 잠시 후에 다시 시도해 주세요.'
}))
app.use('/api', rateLimit({
    windowMs: 1000 * 60 * 60,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: '너무 많은 요청을 시도했어요. 잠시 후에 다시 시도해 주세요.'
}))
app.use('/login', rateLimit({
    windowMs: 1000 * 60 * 60,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: '너무 많은 로그인을 시도했어요. 잠시 후에 다시 시도해 주세요.'
}))
app.use('/api/signup', rateLimit({
    windowMs: 1000 * 60 * 60,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: '너무 많은 회원가입을 시도했어요. 잠시 후에 다시 시도해 주세요.'
}))
app.use((req, res, next) => check(req.user, JSON.stringify(req.body)).then(next).catch(() => res.status(422).send('학교숲 서비스의 사용이 제한되었어요. 곧 재학중인 학교 관리자 혹은 법정대리인에게 정보가 전달이 될 예정이에요.')))
app.get('/', (req, res) => {
    if (req.user) res.status(200).sendFile('main.html', { root })
    else res.status(200).sendFile('index.html', { root })
})

app.get('/about', (req, res) => {
    if (req.require()) return
    res.status(200).sendFile('about.html', { root })
})

app.get('/board', (req, res) => {
    if (req.require()) return
    res.status(200).sendFile('list.html', { root })
})

app.get('/board/:board', (req, res) => {
    if (req.require()) return
    res.status(200).sendFile('board.html', { root })
})

app.get('/board/write/:board', (req, res) => {
    if (req.require()) return
    res.status(200).sendFile('write.html', { root })
})

app.get('/board/:board/:id', (req, res) => {
    if (req.require()) return
    res.status(200).sendFile('article.html', { root })
})

app.get('/user/:id', (req, res) => {
    if (req.require()) return
    res.status(200).sendFile('user.html', { root })
})

app.get('/login', (req, res) => {
    if (req.user) {
        res.redirect('/')
        return
    }
    res.status(200).sendFile('login.html', { root })
})

app.get('/signup', (req, res) => {
    if (req.user) {
        res.redirect('/')
        return
    }
    res.status(200).sendFile('signup.html', { root })
})

app.post('/api/main', main)

app.post('/api/user/:id', (req, res) => {
    if (req.require()) return
    user.read(req.params.id).then(data => {
        const { school, id, name, grade, class: classNumber, profile, parentalVerification } = JSON.parse(data).info
        if (school.orgCode != req.user.school.orgCode) {
            res.status(403).send('사용자 읽기에 실패했어요.\n해당 사용자를 읽을 수 없어요.')
            return
        }
        board.read(req.user).then(data => {
            const json = JSON.parse(data)
            res.status(200).send({
                id,
                kraOrgNm: school.kraOrgNm,
                name,
                grade,
                class: classNumber,
                profile,
                parentalVerificationVerified: parentalVerification.verified,
                articles: Object.keys(json).map(board => json[board].articles.map(i => ({
                    title: i.title,
                    author: i.author,
                    time: i.time,
                    id: i.id,
                    board
                }))).flat().filter(i => i.author == req.params.id).slice(0, 5)
            })
        })
    }).catch(e => {
        if (e.code == 'ENOENT') res.status(404).send('사용자 읽기에 실패했어요.\n해당 사용자를 찾을 수 없어요.')
        else res.status(500).send('사용자 읽기에 실패했어요.\n' + e)
    })
})

app.post('/api/board/list', (req, res) => {
    if (req.require()) return
    board.read(req.user).then(data => {
        const json = JSON.parse(data)
        res.status(200).send(Object.keys(json).map(i => {
            const recentArticle = json[i].articles.sort((a, b) => b.time - a.time)[0]
            return {
                title: i,
                recentArticle: {
                    title: recentArticle?.title,
                    id: recentArticle?.id
                }
            }
        }))
    }).catch(e => res.status(500).send('게시판 목록 읽기에 실패했어요.\n' + e))
})

app.post('/api/board/article', (req, res) => {
    if (req.require()) return
    const { board: boardTitle, id } = req.body
    if (!(boardTitle && id)) res.status(400).send('게시판 제목 및 게시글 아이디를 입력해 주세요.')
    else board.read(req.user).then(data => {
        const board = JSON.parse(data)[boardTitle]
        if (!board) {
            res.status(404).send('해당하는 제목의 게시판이 존재하지 않아요.')
            return
        }
        const article = board.articles.filter(i => i.id == id)[0]
        if (!article) {
            res.status(404).send('해당하는 아이디의 게시글이 존재하지 않아요.')
            return
        }
        res.status(200).send(article)
    }).catch(e => res.status(500).send('게시판 목록 읽기에 실패했어요.\n' + e))
})

app.post('/api/board/articles', (req, res) => {
    if (req.require()) return
    const { board: boardTitle } = req.body
    if (!boardTitle) {
        res.status(400).send('게시판 제목을 입력해 주세요.')
        return
    }
    board.read(req.user).then(data => {
        const board = JSON.parse(data)[boardTitle]
        if (!board) {
            res.status(404).send('해당하는 제목의 게시판이 존재하지 않아요.')
            return
        }
        res.status(200).send({
            title: boardTitle,
            author: board.author,
            time: board.time,
            articles: board.articles.map(i => ({
                title: i.title,
                author: i.author,
                time: i.time,
                id: i.id
            }))
        })
    }).catch(e => res.status(500).send('게시판 목록 읽기에 실패했어요.\n' + e))
})

app.post('/api/board/new', (req, res) => {
    if (req.require()) return
    const { board: boardTitle } = req.body
    if (!boardTitle) {
        res.status(400).send('게시판 제목을 입력해 주세요.')
        return
    }
    if (boardTitle.length > 8) {
        res.status(400).send('게시판 제목은 8글자를 넘을 수 없어요.')
        return
    }
    board.new(req.user, boardTitle).then(() => res.status(200).send({
        message: '게시판 생성에 성공했어요.'
    })).catch(e => res.status(500).send('게시판 생성에 실패했어요.\n' + e))
})

app.post('/api/board/write', (req, res) => {
    if (req.require()) return
    const { board: boardTitle, title, text } = req.body
    if (!(boardTitle && title && text)) {
        res.status(500).send('글 작성에 실패했어요.\n게시판, 글 제목 및 내용을 확인해 주세요.')
        return
    }
    board.write(req.user, boardTitle, title, text).then(id => res.status(200).send({
        id
    })).catch(e => res.status(500).send('글 작성에 실패했어요.\n' + e))
})

app.post('/api/board/comment', (req, res) => {
    if (req.require()) return
    const { board: boardTitle, id, text } = req.body
    if (!(boardTitle && id && text)) {
        res.status(401).send('로그인에 실패했어요.\n이름, 생년월일, 및 비밀번호를 확인해 주세요.')
        return
    }
    board.comment(req.user, boardTitle, id, text).then(() => res.status(200).send({
        message: '댓글을 작성했어요.'
    })).catch(e => res.status(500).send('댓글 작성에 실패했어요.\n' + e))
})

app.post('/api/logout', (req, res) => {
    if (req.require()) return
    user.logout(req.user.id).then(() => res.status(200).end())
})

app.post('/api/login', (req, res) => {
    const { name, birthday, password } = req.body
    if (!(name && birthday && password)) {
        res.status(500).send('로그인에 실패했어요.\n이름, 생년월일, 및 비밀번호를 확인해 주세요.')
        return
    }
    if (birthday.length != 8) {
        res.status(400).send('로그인에 실패했어요.\n생년월일은 8자리로 입력해주세요.')
        return
    }
    user.login(name, birthday, password).then(data => res.status(200).send(data)).catch(e => res.status(500).send('로그인에 실패했어요.\n' + e))
})

app.post('/api/signup', async (req, res) => {
    const { school, gradeNumber, classNumber, name, birthday, number, id, password } = req.body
    if (!(school && gradeNumber && classNumber && name && birthday && number && id && password)) {
        res.status(400).send('회원가입에 실패했어요.\n모든 정보가 올바르게 기입되어 있는지 확인해 주세요.')
        return
    }
    if (['user', 'users', 'admin', 'test', 'root', 'undefined'].includes(id)) {
        res.status(400).send('회원가입에 실패했어요.\n올바른 아이디를 입력해 주세요.')
        return
    }
    if (!id.match('^[A-Za-z0-9]*$')) {
        res.status(400).send('회원가입에 실패했어요.\n아이디는 영어 및 숫자만 허용돼요.')
        return
    }
    if (birthday.length != 8) {
        res.status(400).send('생년월일은 8자리로 입력해주세요.')
        return
    }
    neis.verify(school, gradeNumber, classNumber, name, birthday, number).then(data => user.signup({
        info: {
            school,
            id,
            name,
            birthday,
            grade: gradeNumber,
            class: classNumber,
            usageRestricted: false,
            stdntPNo: data.data[0].data.stdntPNo,
            parentalVerification: {
                verified: getAge(new Date(birthday.substring(0, 4), birthday.substring(4, 6), birthday.substring(6, 8))) >= 14,
            }
        },
        password
    }).then(() => user.login(name, birthday, password).then(data => res.status(200).send(data))).catch(e => res.status(500).send('회원가입에 실패했어요.\n' + e))).catch(e => res.status(e.code).send('학적인증에 실패했어요.\n' + e.error))
})

app.post('/api/signup/school', (req, res) => {
    const { schoolName } = req.body
    neis.school(schoolName).then(data => res.status(200).send(data.map(i => ({
        kraOrgNm: i.kraOrgNm,
        zipAdres: i.zipAdres,
        orgCode: i.orgCode,
        schulCrseScCode: i.schulCrseScCode,
        schulKndScCode: i.schulKndScCode,
        atptOfcdcScCode: i.atptOfcdcScCode
    }))))
})

app.post('/api/verify', (req, res) => {
    if (req.require()) return
    if (req.user.verified) {
        res.status(403).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n인증이 필요 없는 계정이에요. 이미 인증을 완료하였거나 계정의 소유자가 만 14세 이상 이에요.')
        return
    }
    const { name, phone, ssn1, ssn2 } = req.body
    if (!(name && phone && ssn1 && ssn2)) {
        res.status(400).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n모든 정보가 올바르게 기입되어 있는지 확인해 주세요.')
        return
    }
    if (!(Number(phone) && Number(ssn1) && Number(ssn2))) {
        res.status(400).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n법정대리인 휴대전화 번호 및 주민등록번호를 확인해 주세요.')
        return
    }
    const ssn = analyze(ssn1 + ssn2)
    if (!ssn.valid) {
        res.status(400).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n법정대리인의 주민등록번호가 유효하지 않아요.')
        return
    }
    if (ssn.age < 19) {
        res.status(400).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n법정대리인의 나이는 만 19세 이상이여야 해요.')
        return
    }
    oacx.request({
        name,
        phone,
        ssn1,
        ssn2
    }).then(data => res.status(200).send(data)).catch(e => res.status(500).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n' + (e.clientMessage || JSON.stringify(e)).replaceAll('<br/>', '\n')))
})

app.post('/api/verify/result', (req, res) => {
    if (req.require()) return
    if (req.user.verified) {
        res.status(403).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n인증이 필요 없는 계정이에요. 이미 인증을 완료하였거나 계정의 소유자가 만 14세 이상 이에요.')
        return
    }
    if (!req.body) {
        res.status(400).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n올바른 정보를 입력해 주세요.')
        return
    }
    oacx.result(req.body).then(data => user.editProperties(req.user, {
        parentalVerification: {
            verified: true,
            data
        }
    }).then(data => {
        res.status(200).send(data)
    })).catch(e => res.status(500).send('법정대리인 개인정보 제공 본인인증에 실패했어요.\n' + e))
})

app.post('/api/me', (req, res) => {
    if (req.user) res.status(200).send(req.user)
    else res.status(401).end()
})

app.use((req, res) => {
    res.status(404).sendFile('404.html', { root })
})

app.listen(80, () => process.send('ready'))

function getAge(birthday) {
    const today = new Date()
    const thisYear = today.getFullYear()
    const birthYear = birthday.getFullYear()
    let yearAge = thisYear - birthYear
    if (today.getTime() > birthday.setFullYear(thisYear)) {
        yearAge--
    }
    return yearAge
}