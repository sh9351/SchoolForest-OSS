const request = require('../request')
module.exports = (atptOfcdcScCode, orgCode, grade, className, kraOrgNm) => new Promise((resolve, reject) => {
    request({
        host: 'www.schoolinfo.go.kr',
        path: '/ei/ss/Pneiss_b01_s0.do?HG_CD=' + orgCode,
        rejectUnauthorized: false
    }, data => {
        try {
            const date = new Date
            const today = date.getFullYear() + (date.getMonth() + 1).toString().padStart(2, 0) + date.getDate().toString().padStart(2, 0)
            const code = data.split('var sdSchulCode = "')[1].split('"')[0]
            const type = kraOrgNm.endsWith('초등학교') ? 'els' : (kraOrgNm.endsWith('중학교') ? 'mis' : 'his')
            resolve(Promise.allSettled([
                new Promise((resolve, reject) => request({
                    host: 'open.neis.go.kr',
                    path: '/hub/mealServiceDietInfo?Type=json&KEY=' + process.env.NEIS_OPEN_API_KEY + '&ATPT_OFCDC_SC_CODE=' + atptOfcdcScCode + '&SD_SCHUL_CODE=' + code + '&MLSV_FROM_YMD=' + today + '&MLSV_TO_YMD=' + today
                }, data => {
                    try {
                        const json = JSON.parse(data)
                        if (json.RESULT?.MESSAGE == '해당하는 데이터가 없습니다.') {
                            reject('오늘의 급식 정보가 없어요.')
                            return
                        }
                        resolve(json.mealServiceDietInfo[1].row[0])
                    } catch (e) {
                        reject(e.toString())
                    }
                })),
                new Promise((resolve, reject) => request({
                    host: 'open.neis.go.kr',
                    path: '/hub/SchoolSchedule?Type=json&KEY=' + process.env.NEIS_OPEN_API_KEY + '&ATPT_OFCDC_SC_CODE=' + atptOfcdcScCode + '&SD_SCHUL_CODE=' + code + '&AA_FROM_YMD=' + date.getFullYear() + (date.getMonth() + 1).toString().padStart(2, 0) + '01&AA_TO_YMD=' + date.getFullYear() + (date.getMonth() + 1).toString().padStart(2, 0) + '31'
                }, data => {
                    try {
                        const json = JSON.parse(data)
                        if (json.RESULT?.MESSAGE == '해당하는 데이터가 없습니다.') {
                            reject('이번달의 학사일정 정보가 없어요.')
                            return
                        }
                        resolve(json.SchoolSchedule[1].row)
                    } catch (e) {
                        reject(e.toString())
                    }
                })),
                new Promise((resolve, reject) => request({
                    host: 'open.neis.go.kr',
                    path: '/hub/' + type + 'Timetable?Type=json&KEY=' + process.env.NEIS_OPEN_API_KEY + '&ATPT_OFCDC_SC_CODE=' + atptOfcdcScCode + '&SD_SCHUL_CODE=' + code + '&GRADE=' + grade + '&CLASS_NM=' + className + '&TI_FROM_YMD=' + today + '&TI_TO_YMD=' + today
                }, data => {
                    try {
                        const json = JSON.parse(data)
                        if (json.RESULT?.MESSAGE == '해당하는 데이터가 없습니다.') {
                            reject('오늘의 시간표 정보가 없어요.')
                            return
                        }
                        resolve(json[type + 'Timetable'][1].row.filter(i => i.ITRT_CNTNT != '토요휴업일'))
                    } catch (e) {
                        reject(e.toString())
                    }
                }))
            ]))
        } catch (e) {
            reject(e)
        }
    })
})