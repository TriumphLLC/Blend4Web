"use strict";

b4w.register("new_year_language", function(exports, require) {

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

exports.set_language = function(language) {

    _language = language;
}

exports.get_language = function() {

    return _language;
}

exports.get_translation = function(key) {

    var translation = TRANSLATIONS[key];

    if (!translation)
        return "[TRANSLATION FOR " + key + ": NO SUCH KEY]";

    var localized_str = translation[_language];

    if (!localized_str)
        return "[TRANSLATION FOR " + key + ": NO SUCH LANGUAGE]";

    return localized_str;
}

});
