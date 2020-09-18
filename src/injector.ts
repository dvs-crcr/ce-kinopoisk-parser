/** Массив со списком скриптов для подключения */
const scriptArray: Array<string> = [
    '/contentScript.js'
]

const Injector = new class {
    constructor(public scriptsPath: Array<string> = scriptArray) {}
    loadScripts(): void {
        this.scriptsPath.forEach((scriptPath: string) => {
            let s = document.createElement('script');
                s.setAttribute('src', chrome.extension.getURL(scriptPath));
                s.setAttribute('name', 'kpg-extension-id')
                s.setAttribute('content', chrome.runtime.id)
                s.setAttribute('charset', 'utf-8');
            document.documentElement.appendChild(s);
        })
    }
}

/** Подключение контент-скриптов после загрузки объекта window */
window.onload = () => {
    Injector.loadScripts()
}