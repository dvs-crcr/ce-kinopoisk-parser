const BGS = new class {
    constructor() {
        /** Обработка сообщений от контент-скриптов */
        chrome.runtime.onMessageExternal.addListener(async (r, s, c) => {
            // @ts-ignore
            c((typeof this[r.action] === 'function' ? await this[r.action].call(this, ...r.attr): false))
        });
    }
    /** Пинг-понг */
    public ping(): string {
        return 'pong'
    }
    /** Fetch из бэкграунда */
    public async fetch(url: string, options: object = {}, type: string = 'text') {
        return await fetch(url, options).then((response: any) => response[type]())
    }
    /** Скачивание данных json-объекта и изображения */
    public download(tpl: Template) {
        return new Promise((resolve) => {
            let filename = tpl.id?.split(':').join('_')
            if (tpl.poster_url !== null) {
                chrome.downloads.download({url: `https:${tpl.poster_url!}`, filename: `${filename}.jpg`})
            }
            delete tpl.poster_url
            let jsonUrl = this.createJsonUrl(tpl)
            chrome.downloads.download({url: jsonUrl, filename: `${filename}.json`}, () => {
                URL.revokeObjectURL(jsonUrl)
            })
            resolve(true)
        })
    }
    /** Создание ссылки на json-файл из объекта */
    createJsonUrl(tpl: Template): string {
        let blob = new Blob([JSON.stringify(tpl, null, '\t')], {type: 'application/json'});
        return URL.createObjectURL(blob)
    }
}