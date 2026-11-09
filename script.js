const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const customSelects = new Map();
const panelAnimations = new WeakMap();
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const readPreference = (key, fallback) => {
    try {
        return localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
};
const savePreference = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch {}
};
const selects = $$('select');
const translationTargets = [
    ['data-i18n', 'textContent'],
    ['data-i18n-alt', 'alt'],
    ['data-i18n-aria', 'ariaLabel'],
    ['data-i18n-placeholder', 'placeholder']
].flatMap(([attribute, property]) =>
    $$(`[${attribute}]`).map((element) => ({ element, key: element.getAttribute(attribute), property }))
);
const ru = {};
for (const { element, key, property } of translationTargets) ru[key] = element[property];
const dictionaries = { ...translations, ru: { ...ru, ...translations.ru } };
let language = readPreference('roundtheworld-language', 'ru');
if (!dictionaries[language]) language = 'ru';
const t = (key) => dictionaries[language][key] ?? ru[key] ?? key;
const locale = () => ({ ru: 'ru-RU', en: 'en-GB', zh: 'zh-CN' })[language];
let monthFormatter;
let priceFormatter;
const formatMonth = (month) => (month ? monthFormatter.format(new Date(`${month}-01T12:00:00`)) : t('anyMonth'));
const offers = [
    {
        id: 'bali',
        category: 'beach',
        nights: 9,
        price: 129000,
        ru: ['Бали', 'Индонезия', 'Остров вдохновения', 'Виллы среди рисовых террас, океан и закаты Улувату.'],
        en: [
            'Bali',
            'Indonesia',
            'An island of inspiration',
            'Villas among rice terraces, ocean waves, and Uluwatu sunsets.'
        ],
        zh: ['巴厘岛', '印度尼西亚', '灵感之岛', '稻田间的别墅、蔚蓝海水与乌鲁瓦图的日落。']
    },
    {
        id: 'cappadocia',
        category: 'adventure',
        nights: 5,
        price: 89000,
        ru: ['Каппадокия', 'Турция', 'Выше облаков', 'Рассветы с воздушными шарами и сказочные долины.'],
        en: ['Cappadocia', 'Türkiye', 'Above the clouds', 'Balloon-filled sunrises and otherworldly valleys.'],
        zh: ['卡帕多奇亚', '土耳其', '云端之上', '热气球相伴的日出，与如梦似幻的山谷。']
    },
    {
        id: 'italy',
        category: 'culture',
        nights: 7,
        price: 159000,
        ru: ['Италия', 'Европа', 'La dolce vita', 'Цветные улочки, морской бриз и вкус неспешной жизни.'],
        en: ['Italy', 'Europe', 'La dolce vita', 'Colourful streets, sea breezes, and the art of slowing down.'],
        zh: ['意大利', '欧洲', '甜蜜生活', '彩色街巷、轻柔海风与悠然生活的滋味。']
    },
    {
        id: 'maldives',
        category: 'beach',
        nights: 7,
        price: 189000,
        ru: [
            'Мальдивы',
            'Индийский океан',
            'Режим: не беспокоить',
            'Бирюзовые лагуны, белый песок и время только для себя.'
        ],
        en: ['Maldives', 'Indian Ocean', 'Do not disturb', 'Turquoise lagoons, white sand, and time all to yourself.'],
        zh: ['马尔代夫', '印度洋', '请勿打扰', '碧蓝泻湖、洁白沙滩与专属于自己的时光。']
    },
    {
        id: 'japan',
        category: 'culture',
        nights: 10,
        price: 219000,
        ru: ['Япония', 'Восточная Азия', 'Между эпохами', 'Тихие храмы Киото и яркие огни большого Токио.'],
        en: ['Japan', 'East Asia', 'Between eras', 'Quiet Kyoto temples and the bright lights of Tokyo.'],
        zh: ['日本', '东亚', '穿越时光', '京都的静谧古寺，与东京的璀璨灯火。']
    },
    {
        id: 'georgia',
        category: 'adventure',
        nights: 6,
        price: 69000,
        ru: ['Грузия', 'Кавказ', 'Ближе к горам', 'Величие Казбека, уютный Тбилиси и тёплые встречи.'],
        en: [
            'Georgia',
            'The Caucasus',
            'Closer to the mountains',
            'Majestic Kazbek, charming Tbilisi, and a warm welcome.'
        ],
        zh: ['格鲁吉亚', '高加索', '亲近群山', '雄伟的卡兹别克山、温暖的第比利斯与热情相逢。']
    }
];
let activeFilter = 'all';
let selectedDestination = 'all';
let showAll = false;
let searchActive = false;
let currentStatus = null;
const selectedTrip = { month: '', people: '2' };

function addOptions(select, options, fallback = '') {
    const previous = select.value;
    select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
    select.value = options.some(([value]) => value === previous) ? previous : fallback;
    syncSelect(select);
}
function populateSelects() {
    addOptions(
        $('#search-destination'),
        [['all', t('anyDestination')], ...offers.map((offer) => [offer.id, offer[language][0]])],
        'all'
    );
    addOptions($('#contact-offer'), [
        ['', t('chooseOffer')],
        ...offers.map((offer) => [offer.id, `${offer[language][0]} · ${offer.nights} ${t('nights')}`]),
        ['custom', t('helpOffer')]
    ]);
    const today = new Date();
    const months = Array.from({ length: 18 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() + index, 1);
        return [`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, monthFormatter.format(date)];
    });
    addOptions($('#search-month'), [['', t('anyMonth')], ...months]);
    addOptions(
        $('#search-people'),
        Array.from({ length: 6 }, (_, index) => [
            String(index + 1),
            language === 'ru'
                ? `${index + 1} ${index === 0 ? 'человек' : index < 4 ? 'человека' : 'человек'}`
                : t(`traveller${index + 1}`)
        ]),
        '2'
    );
}

function renderCards() {
    const matches = offers.filter(
        (offer) =>
            (activeFilter === 'all' || offer.category === activeFilter) &&
            (selectedDestination === 'all' || offer.id === selectedDestination)
    );
    const visible = showAll ? matches : matches.slice(0, 3);
    $('#destinations-grid').innerHTML = visible
        .map((offer) => {
            const [name, region, tag, description] = offer[language];
            const price = priceFormatter.format(offer.price);
            return `<article class="destination-card"><div class="card-photo"><img src="./images/${offer.id}.jpg" alt="${name} — ${description}" width="850" height="640" loading="lazy" decoding="async"><span class="card-tag">${tag}</span><span class="card-category">${icon('pin')}${region}</span></div><div class="card-content"><div class="card-title-row"><h3>${name}</h3><span class="card-duration">${offer.nights} ${t('nights')}</span></div><p class="card-description">${description}</p><div class="card-bottom"><span class="card-price">${t('from')} <strong>${price} ₽</strong><span>${t('perPerson')}</span></span><button class="card-button" data-offer="${offer.id}" aria-label="${t('details')} ${name}">${icon('up-right')}</button></div></div></article>`;
        })
        .join('');
    const showMore = $('#show-more');
    showMore.hidden = matches.length <= 3;
    showMore.innerHTML = `<span>${t(showAll ? 'showLess' : 'showMore')}</span>${icon('arrow')}`;
    showMore.setAttribute('aria-expanded', String(showAll));
    showMore.setAttribute('aria-controls', 'destinations-grid');
    $$('.filter-tab').forEach((button) => {
        const active = button.dataset.filter === activeFilter;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    const status = $('#search-status');
    status.hidden = !searchActive;
    if (searchActive) {
        const monthLabel = formatMonth(selectedTrip.month);
        const context = [monthLabel, t(`traveller${selectedTrip.people}`)].join(' · ');
        status.replaceChildren(document.createTextNode(`${t('searchFound')} ${matches.length}. ${context} `));
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.textContent = t('clearSearch');
        reset.addEventListener('click', resetSearch);
        status.append(reset);
    }
}
function resetSearch() {
    selectedDestination = 'all';
    activeFilter = 'all';
    showAll = false;
    searchActive = false;
    $('#search-destination').value = 'all';
    $('#search-month').value = '';
    $('#search-people').value = '2';
    selects.forEach(syncSelect);
    selectedTrip.month = '';
    selectedTrip.people = '2';
    renderCards();
    updateTripSummary();
}
function updateTripSummary() {
    syncSelect($('#contact-offer'));
    const summary = $('#trip-summary');
    summary.hidden = !searchActive;
    if (searchActive) {
        const date = formatMonth(selectedTrip.month);
        summary.textContent = `${date} · ${t(`traveller${selectedTrip.people}`)}`;
    }
}
function setLanguage(nextLanguage) {
    language = dictionaries[nextLanguage] ? nextLanguage : 'ru';
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    $('#language').value = language;
    syncSelect($('#language'));
    savePreference('roundtheworld-language', language);
    translationTargets.forEach(({ element, key, property }) => (element[property] = t(key)));
    $('.brand').setAttribute('aria-label', t('brandHome'));
    updateThemeButton();
    document.title = t('pageTitle');
    $('meta[name=description]').content = t('pageDescription');
    monthFormatter = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' });
    priceFormatter = new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 });
    populateSelects();
    renderCards();
    updateTripSummary();
    $$('[data-error-key]').forEach((element) => (element.textContent = t(element.dataset.errorKey)));
    if (currentStatus) $('#form-status').textContent = t(currentStatus);
}

function animatePanel(panel, open) {
    if (panel.dataset.open === String(open) || (!open && panel.hidden)) return;
    panel.dataset.open = String(open);
    panelAnimations.get(panel)?.cancel();
    panel.hidden = false;
    panel.inert = !open;
    const frames = [
        { opacity: 0, transform: 'translateY(-8px) scale(.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
    ];
    const animation = panel.animate(open ? frames : [...frames].reverse(), {
        duration: reducedMotion.matches ? 0 : 240,
        easing: 'cubic-bezier(.2, .7, .2, 1)',
        fill: 'both'
    });
    panelAnimations.set(panel, animation);
    animation.finished
        .then(() => {
            if (panelAnimations.get(panel) !== animation) return;
            panel.hidden = !open;
            animation.cancel();
        })
        .catch(() => {});
}

function syncSelect(select) {
    const control = customSelects.get(select);
    if (!control) return;
    control.button.textContent =
        select.id === 'language'
            ? { ru: 'RU', en: 'EN', zh: '中文' }[select.value]
            : select.selectedOptions[0]?.textContent || '';
    control.button.setAttribute(
        'aria-label',
        select.getAttribute('aria-label') ||
            select.closest('.form-field, .search-field')?.querySelector('span')?.textContent.trim() ||
            control.button.textContent
    );
    const options = [...select.options];
    const signature = JSON.stringify(options.map((option) => [option.value, option.textContent]));
    if (control.signature !== signature) {
        control.signature = signature;
        control.list.replaceChildren(
            ...options.map((option) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.role = 'option';
                button.dataset.value = option.value;
                button.textContent = option.textContent;
                return button;
            })
        );
    }
    [...control.list.children].forEach((button) =>
        button.setAttribute('aria-selected', String(button.dataset.value === select.value))
    );
}

function closeDropdown(control) {
    control.button.setAttribute('aria-expanded', 'false');
    animatePanel(control.list, false);
}

function initializeSelects() {
    selects.forEach((select) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dropdown-toggle';
        button.setAttribute('role', 'combobox');
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');
        const list = document.createElement('div');
        list.className = 'dropdown-menu';
        list.id = `${select.id}-options`;
        list.role = 'listbox';
        list.hidden = true;
        button.setAttribute('aria-controls', list.id);
        const control = { button, list };
        customSelects.set(select, control);
        list.addEventListener('click', (event) => {
            const option = event.target.closest('[data-value]');
            if (!option) return;
            select.value = option.dataset.value;
            closeDropdown(control);
            button.focus({ preventScroll: true });
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncSelect(select);
        });
        select.hidden = true;
        select.after(wrapper);
        wrapper.append(button, list);
        button.addEventListener('click', () => {
            const open = button.getAttribute('aria-expanded') !== 'true';
            customSelects.forEach((other) => {
                if (other !== control) closeDropdown(other);
            });
            button.setAttribute('aria-expanded', String(open));
            animatePanel(list, open);
        });
        wrapper.addEventListener('keydown', (event) => {
            const options = [...list.children];
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                button.setAttribute('aria-expanded', 'true');
                animatePanel(list, true);
                const index = options.indexOf(document.activeElement);
                const next =
                    event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? options.length - 1
                          : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
                options[next]?.focus({ preventScroll: true });
            }
            if (event.key === 'Escape') {
                closeDropdown(control);
                button.focus({ preventScroll: true });
            }
        });
        wrapper.addEventListener('focusout', (event) => {
            if (!wrapper.contains(event.relatedTarget)) closeDropdown(control);
        });
        syncSelect(select);
    });
}

let theme = readPreference('roundtheworld-theme', 'light');
if (!['light', 'dark'].includes(theme)) theme = 'light';
function setTheme(nextTheme) {
    theme = nextTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    $('meta[name=theme-color]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    updateThemeButton();
    savePreference('roundtheworld-theme', theme);
}
function updateThemeButton() {
    $('#theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
    $('#theme-toggle').setAttribute('aria-label', t(theme === 'dark' ? 'themeLight' : 'themeDark'));
}
$('#theme-toggle').addEventListener('click', () => {
    customSelects.forEach(closeDropdown);
    setTheme(theme === 'dark' ? 'light' : 'dark');
});
$('#language').addEventListener('change', (event) => setLanguage(event.target.value));
function closeMobileMenu() {
    $('#mobile-toggle').setAttribute('aria-expanded', 'false');
    $('#mobile-toggle use').setAttribute('href', '#i-menu');
    animatePanel($('#mobile-nav'), false);
}
$('#mobile-toggle').addEventListener('click', () => {
    const open = $('#mobile-toggle').getAttribute('aria-expanded') !== 'true';
    $('#mobile-toggle').setAttribute('aria-expanded', String(open));
    $('#mobile-toggle use').setAttribute('href', open ? '#i-close' : '#i-menu');
    animatePanel($('#mobile-nav'), open);
});
$$('#mobile-nav a').forEach((link) => link.addEventListener('click', closeMobileMenu));
matchMedia('(min-width: 1101px)').addEventListener('change', (event) => {
    if (event.matches) closeMobileMenu();
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeMobileMenu();
    }
});
document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMobileMenu();
    customSelects.forEach((control) => {
        if (!control.button.parentElement.contains(event.target)) closeDropdown(control);
    });
});

let scrollFrame = 0;
function scrollToSection(target) {
    cancelAnimationFrame(scrollFrame);
    const from = window.scrollY;
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const top = Math.min(
        maximum,
        Math.max(0, target.getBoundingClientRect().top + from - $('.site-header').offsetHeight - 24)
    );
    if (reducedMotion.matches) {
        window.scrollTo({ top, behavior: 'instant' });
        return;
    }
    const duration = Math.min(1400, 700 + Math.abs(top - from) * 0.12);
    const started = performance.now();
    function step(now) {
        const progress = Math.min(1, (now - started) / duration);
        const ease = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        window.scrollTo({ top: from + (top - from) * ease, behavior: 'instant' });
        if (progress < 1) scrollFrame = requestAnimationFrame(step);
    }
    scrollFrame = requestAnimationFrame(step);
}
for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(event, () => cancelAnimationFrame(scrollFrame), { passive: true });
}
document.querySelectorAll('a[href^="#"]').forEach((link) =>
    link.addEventListener('click', (event) => {
        const hash = link.getAttribute('href');
        const target = hash === '#' ? document.body : document.querySelector(hash);
        if (!target) return;
        event.preventDefault();
        scrollToSection(target);
        if (location.protocol !== 'file:') history.pushState(null, '', hash);
    })
);

$$('.faq-list details').forEach((details) => {
    const summary = details.querySelector('summary');
    const content = document.createElement('div');
    content.className = 'faq-answer';
    content.append(details.querySelector('p'));
    details.append(content);
    let animation;
    summary.addEventListener('click', (event) => {
        event.preventDefault();
        const open = !details.classList.contains('is-open');
        const height = details.open ? content.getBoundingClientRect().height : 0;
        const opacity = details.open ? getComputedStyle(content).opacity : 0;
        animation?.cancel();
        details.open = true;
        details.classList.toggle('is-open', open);
        const current = content.animate(
            [
                { height: `${height}px`, opacity },
                { height: `${open ? content.scrollHeight : 0}px`, opacity: open ? 1 : 0 }
            ],
            { duration: reducedMotion.matches ? 0 : 400, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'both' }
        );
        animation = current;
        current.finished
            .then(() => {
                if (animation !== current) return;
                details.open = open;
                current.cancel();
                animation = null;
            })
            .catch(() => {});
    });
});

window.addEventListener('scroll', () => $('.site-header').classList.toggle('scrolled', window.scrollY > 10), {
    passive: true
});

$$('.filter-tab').forEach((button) =>
    button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        selectedDestination = 'all';
        showAll = true;
        searchActive = false;
        $('#search-destination').value = 'all';
        syncSelect($('#search-destination'));
        renderCards();
        updateTripSummary();
    })
);
$('#show-more').addEventListener('click', () => {
    showAll = !showAll;
    renderCards();
    if (!showAll) scrollToSection($('#destinations'));
});
$('#trip-search').addEventListener('submit', (event) => {
    event.preventDefault();
    selectedDestination = $('#search-destination').value;
    activeFilter = 'all';
    showAll = true;
    searchActive = true;
    selectedTrip.month = $('#search-month').value;
    selectedTrip.people = $('#search-people').value;
    $('#contact-offer').value = selectedDestination === 'all' ? 'custom' : selectedDestination;
    clearError('offer');
    clearFormStatus();
    renderCards();
    updateTripSummary();
    scrollToSection($('#destinations'));
});
$('#destinations-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-offer]');
    if (!button) return;
    $('#contact-offer').value = button.dataset.offer;
    clearError('offer');
    clearFormStatus();
    syncSelect($('#contact-offer'));
    scrollToSection($('#contact'));
});

const dialog = $('#privacy-dialog');
[$('#privacy-open'), $('#privacy-footer')].forEach((button) =>
    button.addEventListener('click', () => dialog.showModal())
);
[$('#privacy-close'), $('#privacy-ok')].forEach((button) => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        )
            dialog.close();
    }
});

function clearError(field) {
    const element = $(`#error-${field}`);
    element.textContent = '';
    delete element.dataset.errorKey;
    const input = $(`[name="${field}"]`, $('#contact-form'));
    input.removeAttribute('aria-invalid');
    customSelects.get(input)?.button.removeAttribute('aria-invalid');
}
function setError(field, key) {
    const element = $(`#error-${field}`);
    element.dataset.errorKey = key;
    element.textContent = t(key);
    const input = $(`[name="${field}"]`, $('#contact-form'));
    input.setAttribute('aria-invalid', 'true');
    customSelects.get(input)?.button.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', `error-${field}`);
}
const validContact = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
    (/^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15);
function clearFormStatus() {
    if (currentStatus) {
        $('#form-status').hidden = true;
        currentStatus = null;
    }
}
$('#contact-form').addEventListener('input', (event) => {
    if (['name', 'contact', 'offer', 'consent'].includes(event.target.name)) clearError(event.target.name);
    clearFormStatus();
});
$('#contact-form').addEventListener('submit', (event) => {
    event.preventDefault();
    ['name', 'contact', 'offer', 'consent'].forEach(clearError);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.name = data.name.trim();
    data.contact = data.contact.trim();
    data.consent = $('#contact-consent').checked;
    const errors = [];
    if (data.name.length < 2) errors.push(['name', 'errorName']);
    if (!validContact(data.contact)) errors.push(['contact', 'errorContact']);
    if (![...offers.map((offer) => offer.id), 'custom'].includes(data.offer)) errors.push(['offer', 'errorOffer']);
    if (!data.consent) errors.push(['consent', 'errorConsent']);
    if (errors.length) {
        errors.forEach(([field, key]) => setError(field, key));
        const invalid = $(`[name="${errors[0][0]}"]`, form);
        (customSelects.get(invalid)?.button || invalid).focus();
        return;
    }
    currentStatus = 'success';
    const status = $('#form-status');
    status.textContent = t('success');
    status.hidden = false;
    form.reset();
    $('#contact-offer').value = data.offer;
    syncSelect($('#contact-offer'));
});

initializeSelects();
setTheme(theme);
setLanguage(language);
$('#year').textContent = new Date().getFullYear();
if ('IntersectionObserver' in window) {
    document.body.classList.add('js-ready');
    const observer = new IntersectionObserver(
        (entries) =>
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            }),
        { threshold: 0.08 }
    );
    $$('.reveal').forEach((element) => observer.observe(element));
}
