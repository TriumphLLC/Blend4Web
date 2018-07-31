# Change log

## 2.3.0 / 2016-08-22

- Use explicit pug-walk dependency; fixes installation on npm v2
- Allow setting Pug options from webpack.config.js's `pugLoader` property

## 2.2.1 / 2016-08-06

- Minor README correction
- Remove unused `web_modules/fs.js`

## 2.2.0 / 2016-07-26

- Revert to v2.0.0
  - v2.1.0 has a bug that prevents users from having working inclusion if
    `pug-loader` has already been bound

## 2.1.0 / 2016-07-25

- Make it unnecessary to bind `pug-loader` in order to use includes

## 2.0.0 / 2016-07-25

- Rename package from `jade-loader` to `pug-loader`
  - `pug-loader@1` has been renamed as `pug-load`
- Update to Pug 2.0.0
  - Reimplement as a Pug plugin
- Add `plugins` option
- Add a change log (the file you are reading!) and a license file
- Enrich the README
