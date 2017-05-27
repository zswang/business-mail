const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const bodyParser = require('body-parser')
const RealtimeConfig = require('rtconfig')

var config = new RealtimeConfig('./config.js')

var mails
var lastLoadTime = 0
var port = parseInt(process.argv[2]) || 3000

function loadMails(callback) {
  if (Date.now() - lastLoadTime < config.scandelay) {
    return mails
  }
  lastLoadTime = Date.now()

  glob(path.join(__dirname, 'mails/*.html'), (err, files) => {
    mails = files.map((filename) => {
      var html = String(fs.readFileSync(filename)).replace(/#\{date\}/g, () => {
        var now = new Date()
        return now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日'
      })
      var item = {
        name: path.basename(filename),
        html: html,
      }
      html.replace(/<div>subject:(.*?)<\/div>/, (all, subject) => {
        item.subject = subject
      })
      return item
    })
    callback(err)
  })
}

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/list', (req, res) => {
  loadMails((err) => {
    res.json({
      status: 200,
      data: mails
    })
  })
})

const MailComposer = require('nodemailer/lib/mail-composer/')

app.post('/download', (req, res) => {
  console.log('^linenum download %j', req.body)

  let mailItem
  mails.some((item) => {
    if (item.name === req.body['mail-name']) {
      mailItem = item
      return true
    }
  })

  if (!mailItem) {
    res.end(404, 'error')
    return
  }

  function mailReplace(html) {
    return String(html || '').
      replace(/<!--remove-->[^]*?<!--\/remove-->\s*/g, '').
      replace(/<span class="default_text"[^>]*>([\w\u4e00-\u9fa5\[\].:-]+)<\/span>/g, (all, name) => {
        return req.body[name] || ''
      }).
      replace(/\{\{([\w\u4e00-\u9fa5\[\].:-]+)\}\}/g, (all, name) => {
        return req.body[name] || ''
      })
  }

  let data = {
    from: req.body.from,
    to: req.body.to,
    html: mailReplace(mailItem.html),
    subject: mailReplace(mailItem.subject),
  }

  let mail = new MailComposer(data).compile()
  mail.build((err, message) => {
    if (err) {
      res.end(500, err)
      return
    }
    res.attachment(path.basename(req.body['mail-name'], '.html') + '.eml')
    res.send(message)
  })
})


app.listen(port)
console.log('^linenum server listen: %j', port)