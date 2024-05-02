const request = require('../request')
module.exports = type => new Promise((resolve, reject) => {
    try {
        if (type == 'primary' || type == 'mid') request({
            host: type + '.ebs.co.kr',
            path: '/board/basic/list?pageNo=1&' + (type == 'primary' ? 'parentCd=eduNews&boardId=130' : 'parentCd=eduNewsParent&boardId=113'),
            method: 'POST'
        }, data => resolve({
            type,
            data: data.split('<tbody>')[1].split('<td class="title">').slice(1).map(i => ({
                title: i.split('<!-- 비밀글 -->')[1]?.split('</a>')[0].replace('\r\n\t\t\t\t\t\t\t\t\t\t\t\t', '').replace(/&(nbsp|amp|quot|lt|gt);/g, (match, entity) => ({
                    "nbsp": " ",
                    "amp": "&",
                    "quot": "\"",
                    "lt": "<",
                    "gt": ">"
                }[entity])).replace(/&#(\d+);/gi, (match, str) => String.fromCharCode(parseInt(str, 10))).replaceAll('<br>', '\n').trim(),
                url: i.split('<a href="')[1]?.split('">')[0],
                date: i.split('<!-- 작성일 시작 -->')[1]?.split('<td>')[1].split('</td>')[0]
            }))
        }))
        else request({
            host: 'www.ebsi.co.kr',
            path: '/ebs/ent/enta/retrieveEntNewsEduList.ebs',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
            }
        }, data => resolve({
            data: data.split('<li class="tbody">').slice(1).slice(0, -1).map(i => ({
                type,
                title: i.split('<span id="resultTitle')[1]?.split('">')[1]?.split('</span>')[0].replace(/&(nbsp|amp|quot|lt|gt);/g, (match, entity) => ({
                    "nbsp": " ",
                    "amp": "&",
                    "quot": "\"",
                    "lt": "<",
                    "gt": ">"
                }[entity])).replace(/&#(\d+);/gi, (match, str) => String.fromCharCode(parseInt(str, 10))).replaceAll('<br>', '\n').trim(),
                date: i.split('<div class="col_2">')[2]?.split('</div>')[0].replace('\r\n', '').trim(),
                id: i.split('fncViewArticle(\'B011\',\'')[1]?.split('\'')[0],
            }))
        }))
    } catch (e) {
        reject(e)
    }
})