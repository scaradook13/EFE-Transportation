import http from 'http'

http.get('http://localhost:3000/login', (res) => {
  console.log(res.headers)
  process.exit(0)
})
