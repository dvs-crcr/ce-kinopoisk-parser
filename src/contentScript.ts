interface Window {
    __NEXT_DATA__: any
}
interface MainData {
    avail: boolean
    type: pageType
    id: string
    kpid: string
}
interface Template {
    id?: string
    data?: MainData
    title?: string
    tagline?: string
    countries?: string[]
    genres?: string[]
    description?: string
    duration?: Array<string | null> | null
    rating_kp?: number
    rating_imdb?: number
    directors?: Object[]
    actors?: Object[]
    poster_url?: string | null
}
interface Title {
    origirnal: string | null
    russian: string | null
}
interface ReleaseYears {
    start: number | null
    end: number | null
}
interface Rating {
    kp: number
    imdb: number
}
type pageType = 'Film' | 'TvSeries' | ''

const KPG = new class {
    tpl: Template = {}
    availableTypes: string[] = ['Film', 'TvSeries']
    extid: string = document.querySelector<HTMLScriptElement>('script[name="kpg-extension-id"]')!.getAttribute('content')!
    actionButton: HTMLElement = document.createElement('a')

    constructor() {
        if (this.raw_data && this.data.avail) {
            if (this.availableTypes.includes(this.data.type)) {
                this.process(this.data.type).then((tpl: Template) => {
                    this.tpl = tpl
                    this.loadActionButton('+')
                })
            }
        }
    }
    /** Обработка и серилизация данных страницы фильма или сериала  */
    process(pageType: pageType) {
        return this.getRating()
            .then((rating: Rating): Template => ({
                id: this.data.id,
                title: (pageType === 'Film' ? `${(this.title.russian ? this.title.russian : '')}${(this.title.russian && this.title.origirnal ? ' / ' : '')}${(this.title.origirnal ? this.title.origirnal : '')} (${this.productionYear})` : `${(this.title.russian ? this.title.russian : '')}${(this.title.russian && this.title.origirnal ? ' / ' : '')}${(this.title.origirnal ? this.title.origirnal : '')} (${(this.releaseYears.start?this.releaseYears.start:'')}${(this.releaseYears.start === this.releaseYears.end?'':(this.releaseYears.start && this.releaseYears.end?(this.releaseYears.end?' — '+this.releaseYears.end:''):''))})`),
                tagline: this.tagline,
                countries: this.countries,
                genres: this.genres,
                description: this.description,
                duration: (pageType === 'Film' ? this._durationConvert(this.duration) : null),
                rating_kp: rating.kp,
                rating_imdb: rating.imdb,
                directors: this.directors,
                actors: this.actors,
                poster_url: this.poster_url
            }))
    }
    /** Вставка кнопки обработчика */
    loadActionButton(text?: string): void {
        this.actionButton.setAttribute('class', 'kpg-action-button')
        this.actionButton.setAttribute('href', '#')
        this.actionButton.onclick = () => {
            if (!this.actionButton.getAttribute('animation')) {
                this.actionButton.setAttribute('animation','rotating')
                this._sendMessage('download',[this.tpl])
                    .then((response: any) => {
                        if (response === true) {
                            this.actionButton.innerHTML = 'ok'
                            this.actionButton.removeAttribute('animation')
                            this.actionButton.setAttribute('class', 'kpg-action-button done')
                            this.actionButton.onclick = () => false
                        }
                    })
            }
            return false;
        }
        if (text) this.actionButton.innerHTML = text
        document.getElementsByTagName('body')[0].appendChild(this.actionButton);
    }

    /** Информация о рейтинге */
    getRating = async () => {
        return await this._sendMessage('fetch',[`https://rating.kinopoisk.ru/${this.data.kpid}.xml`])
            .then((xml:any) => {
                let parser = new DOMParser()
                let doc = parser.parseFromString(xml, 'application/xml')
                return { 
                    kp: parseFloat(Array.from(doc.documentElement.getElementsByTagName('kp_rating'))[0]?.innerHTML), 
                    imdb: parseFloat(Array.from(doc.documentElement.getElementsByTagName('imdb_rating'))[0]?.innerHTML)
                }
            })
    }
    /** Отправка ссобщения в бэкграунд */
    _sendMessage(action: string = 'ping', attr: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => chrome.runtime.sendMessage(this.extid, {action,attr}, (res) => (res === false ? reject() : resolve(res))))
    }
    /** Конвертируем количество минут в часы и минуты */
    _durationConvert(minutes: number): Array<string | null> {
        if (minutes) {
            let h = Math.floor(minutes / 60);
            let m = minutes - (h * 60);
            return (h < 1 ? [null, minutes.toString()] : [(h<10?'0'+h:h.toString()), (m<10?'0'+m:m.toString())])
        }
        return [null, null]
    }
    /** Получение объекта __NEXT_DATA__ со страницы */
    get raw_data(): any {
        if (window.__NEXT_DATA__) {
            return window.__NEXT_DATA__.props.apolloState.data
        } else {
            return false
        }
    }
    /** Получение основных данных со страницы */
    get data(): MainData {
        let root_query: {[key: string]: any} = this.raw_data.ROOT_QUERY
        let result: MainData = {
            avail: false,
            type: '',
            id: '',
            kpid: ''
        }
        Object.keys(root_query).forEach((item: string) => {
            if (root_query[item] !== null && typeof root_query[item].typename !== 'undefined') {
                result = {
                    avail: (this.availableTypes.includes(root_query[item].typename) ? true : false),
                    type: root_query[item].typename,
                    id: root_query[item].id,
                    kpid: root_query[item].id.split(':')[1]
                }
            }
        })
        return result
    }
    /** Получение Названия */
    get title(): Title {
        let title_id = this.raw_data[this.data.id]?.title?.id
        let title_data = this.raw_data[title_id]
        return {
            origirnal: title_data.original,
            russian: title_data.russian
        }
    }
    /** Получение слогана */
    get tagline(): string {
        return this.raw_data[this.data.id]?.tagline
    }
    /** Год производства фильма */
    get productionYear(): number {
        return this.raw_data[this.data.id]?.productionYear
    }
    /** Год релиза сериала */
    get releaseYears(): ReleaseYears {
        let ry_id = this.raw_data[this.data.id]?.releaseYears[0]?.id
        let ry_data = this.raw_data[ry_id]
        return {
            start: ry_data.start,
            end: ry_data.end
        }
    }
    /** Страна производства */
    get countries(): any {
        return this.raw_data[this.data.id]?.countries?.map((i: any) => this.raw_data[i.id].name)
    }
    /** Жанры */
    get genres(): any {
        return this.raw_data[this.data.id]?.genres?.map((i: any) => this.raw_data[i.id].name)
    }
    /** Описания */
    get description(): string {
        return this.raw_data[this.data.id]?.synopsis
    }
    /** Длительность в минутах */
    get duration(): number {
        return this.raw_data[this.data.id]?.duration
    }
    /** Режиссеры */
    get directors(): Object[] {
        let director_key = Object.keys(this.raw_data[this.data.id]).filter(key => /^members(?=.*\bDIRECTOR\b).*$/m.test(key))
        let directors_id = this.raw_data[this.data.id][director_key[0]].id
        return this.raw_data[directors_id].items.map((i: any) => {
            let person = this.raw_data[this.raw_data[i.id].person.id]
            return {
                name: person.name,
                originalName: person.originalName
            }
        })
    }
    /** Актеры */
    get actors(): Object[] {
        let actors_key = Object.keys(this.raw_data[this.data.id]).filter(key => /^members(?=.*\bACTOR\b).*$/m.test(key))
        let actors_id = this.raw_data[this.data.id][actors_key[0]].id
        return this.raw_data[actors_id].items.map((i: any) => {
            let person = this.raw_data[this.raw_data[i.id].person.id]
            return {
                name: person.name,
                originalName: person.originalName
            }
        })
    }
    /** URL Постера */
    get poster_url(): string | null {
        let pu = document.querySelectorAll('img.film-poster')[0]?.getAttribute('src')
        return (/^(?=.*\bno-movie-poster\b).*$/m.test((pu?pu:'')) ? null : pu)
    }
}