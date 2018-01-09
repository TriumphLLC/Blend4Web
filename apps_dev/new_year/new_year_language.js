var _language = "en";

var TRANSLATIONS = {

    "default_text": {
        "ru": "Уважаемые пользователи!\nНа этот Новый год мы приготовили для вас особенный подарок.\nЭтой трёхмерной открыткой вы можете поздравить своих близких, знакомых и просто всех тех, кто посетит вашу страницу в соцсети или в блоге.\nЖелаем Вам процветания и благополучия в 2015 году!",
        "en": "Dear users!\nFor this New Year's we have prepared a special gift for you.\nWith this 3D greeting card you can congratulate your family, friends and the visitors of your blog or social account.\nWe wish you happiness and prosperity in the coming 2015!"
    },
    "title": {
        "ru": "С Новым Годом! Попробуйте открыть подарки, включите телевизор, отправьте друзьям свое поздравление!",
        "en": "Happy New Year! Try opening the presents, turn on the TV and even send a personal greeting!"
    }
};

export function set_language(language) {

    _language = language;
}

export function get_language() {

    return _language;
}

export function get_translation(key) {

    var translation = TRANSLATIONS[key];

    if (!translation)
        return "[TRANSLATION FOR " + key + ": NO SUCH KEY]";

    var localized_str = translation[_language];

    if (!localized_str)
        return "[TRANSLATION FOR " + key + ": NO SUCH LANGUAGE]";

    return localized_str;
}
