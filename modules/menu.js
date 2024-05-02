module.exports = age => {
    const menu = [
        {
            name: '클래스팅',
            icon: 'classting.png',
            url: 'https://www.classting.com/'
        },
        {
            name: '에듀넷',
            icon: 'edunet.jpg',
            url: 'https://www.edunet.net/nedu/main/mainForm.do'
        }
    ]
    if (age <= 13) {
        menu.push({
            name: 'e학습터',
            icon: 'edunet.jpg',
            url: 'https://cls.edunet.net'
        }, {
            name: 'EBS 초등',
            icon: 'ebs_primary.ico',
            url: 'https://primary.ebs.co.kr/main/primary'
        })
    } else if (age > 13 && age <= 16) {
        menu.push({
            name: 'EBS 중학',
            icon: 'ebs_middle.ico',
            url: 'https://mid.ebs.co.kr/main/middle'
        }, {
            name: '리로스쿨',
            icon: 'riro.jpg',
            url: 'https://rirosoft.com/'
        })
    } else if (age > 16) {
        menu.length = 0
        menu.push({
            name: '대성마이맥',
            icon: 'ds.jpg',
            url: 'https://www.mimacstudy.com/main/main.ds'
        }, {
            name: '메가스터디',
            icon: 'mega.png',
            url: 'http://www.megastudy.net/'
        }, {
            name: '이투스',
            icon: 'etoos.png',
            url: 'https://www.etoos.com/home/default.asp'
        }, {
            name: '리로스쿨',
            icon: 'riro.jpg',
            url: 'https://rirosoft.com/'
        }, {
            name: 'EBSi',
            icon: 'ebsi.jpg',
            url: 'https://www.ebsi.co.kr/ebs/pot/poti/main.ebs'
        })
    }
    return menu
}

/*
클래스팅 - 전체
에듀넷 - 전체
e학습터 - 초등
ebs - 초등/중등
리로스쿨 - 중고등
대성마이맥 - 고등
메가스터디 - 고등
이투스 - 고등
ebsi - 고등
*/