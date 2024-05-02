const request = require('../request')
const removeEmpty = (object) => {
    Object.keys(object).forEach(k =>
        (object[k] && typeof object[k] === 'object') && removeEmpty(object[k]) ||
        (!object[k] && object[k] !== undefined) && delete object[k]
    )
    return object
}
module.exports = {
    school: schoolName => new Promise((resolve, reject) => request({
        host: 'www.neis.go.kr',
        path: '/pas_ocm_oi00_002.do?kraOrgNm=' + encodeURI(schoolName)
    }, data => {
        const schools = JSON.parse(data).resultSVO.data.orgDVOList
        if (!schools) {
            reject({
                error: '해당 학교를 찾을 수 없어요. 학교명을 올바르게 입력했는지 확인해 주세요.',
                result: 'ERROR',
                code: 404
            })
        } else resolve(schools)
    })),
    verify: (school, grade, classNumber, name, birthday, number) => new Promise((resolve, reject) => request({
        host: 'www.neis.go.kr',
        path: '/pas_mms_mi10_003.do?' + encodeURI("encptData={pasMmsMi101DVO_schulCode:'" + school.orgCode + "',pasMmsMi101DVO_schulCrseScCode:'" + school.schulCrseScCode + "',pasMmsMi101DVO_schulKndScCode:'" + school.schulKndScCode + "',pasMmsMi101DVO_bassOfcdcCode:'" + school.atptOfcdcScCode + "',ay:'" + new Date().getFullYear() + "',pasMmsMi101DVO_grade:'" + grade + "',dghtCrseScCode:'1'}&joinType=SC"),
        method: 'POST'
    }, data => {
        try {
            let classFound
            JSON.parse(data).resultSVO.classList.split('null,null,').slice(1).forEach(className => {
                const pairs = className.split(',').slice(0, -1)
                if (pairs[1] == classNumber) {
                    classFound = true
                    const classNumber = pairs[0]
                    request({
                        host: 'www.neis.go.kr',
                        path: '/pas_mms_mi10_003.do?' + encodeURI("encptData={pasMmsMi101DVO_mberNmEncpt:'" + name + "',pasMmsMi101DVO_schulCode:'" + school.orgCode + "',pasMmsMi101DVO_schulCrseScCode:'" + school.schulCrseScCode + "',pasMmsMi101DVO_schulKndScCode:'" + school.schulKndScCode + "',pasMmsMi101DVO_grade:'" + grade + "',classNm:'" + classNumber + "',stdntCnEncpt:'" + number + "',pasMmsMi101DVO_bassOfcdcCode:'" + school.atptOfcdcScCode + "',stdntDob:'" + birthday + "',ay:'" + new Date().getFullYear() + "',dghtCrseScCode:'1'}&joinType=S")
                    }, data => {
                        if (JSON.parse(data).resultSVO.hakjekYn.length > 0) {
                            resolve({
                                code: 200,
                                data: removeEmpty(JSON.parse(data).resultSVO.hakjekYn)
                            })
                        } else {
                            reject({
                                error: '학적 정보를 찾을 수 없어요. 이름, 생년월일, 및 번호를 올바르게 입력했는지 확인해 주세요.',
                                result: 'ERROR',
                                code: 404,
                                data: removeEmpty(JSON.parse(data).resultSVO.hakjekYn)
                            })
                        }
                    })
                }
            })
            if (!classFound) {
                reject({
                    error: '해당 학급을 찾을 수 없어요. 반을 올바르게 입력했는지 확인해 주세요.',
                    result: 'ERROR',
                    code: 404
                })
            }
        } catch (error) {
            reject({
                error,
                result: 'ERROR',
                code: 500
            })
        }
    }))
}