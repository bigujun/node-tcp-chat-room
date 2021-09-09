module.exports = {
    Reset : "\x1b[0m",
    Next: function () {
        this.count = this.count && this.count < 37 ? this.count + 1 : 31;
        return `\x1b[${this.count}m`
    }
}