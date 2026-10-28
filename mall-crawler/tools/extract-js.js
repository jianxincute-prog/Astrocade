// Ambil isi <script> utama dari game_code.html agar bisa di-lint / di-syntax-check.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'game_code.html'), 'utf8');
const start = html.indexOf('<script>\n    /**');
const end = html.lastIndexOf('</script>');
if (start < 0 || end < 0) throw new Error('script utama tidak ditemukan');
fs.writeFileSync(path.join(__dirname, '.extracted.js'), html.slice(start + '<script>'.length, end));
