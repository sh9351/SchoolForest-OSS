const request = require('../request')
module.exports = host => new Promise((resolve, reject) => request({
    host,
    path: '/r/newReading/main/mainPopularDataPop.jsp'
}, data => {
    try {
        resolve(data.split('<tbody>')[1]?.split('</tbody>')[0]?.split('<tr>')?.slice(1).map(i => ({
            title: i.split('<td class="left">')[1]?.split('</td>')[0],
            author: i.split('<td>')[2]?.split('</td>')[0]
        }))?.reduce((c, n) => c.filter(i => i.title == n.title).length == 0 ? [...c, n] : c, []))
    } catch (e) {
        reject(e)
    }
}))