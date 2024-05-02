try {
    window.addEventListener('load', () => {
        const schoolname = document.querySelector('.schoolname')
        api('/api/me').then(user => {
            window.user = user
            schoolname.innerHTML = user.school.kraOrgNm
            window.dispatchEvent(new Event('user'))
        })
    })
} catch (e) {
    console.error(e)
}
window.api = (url, body) => new Promise(resolve => fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
        'Content-Type': 'application/json'
    }
}).then(res => {
    if (res.ok) res.json().then(resolve)
    else res.text().then(alert)
}))