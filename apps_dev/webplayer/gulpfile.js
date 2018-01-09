const gulp         = require('gulp');
const rename       = require("gulp-rename");
const sass         = require("gulp-sass");
const autoprefixer = require('gulp-autoprefixer');
const notify       = require("gulp-notify");
const postcss      = require('gulp-postcss');
const base64       = require('postcss-base64');

gulp.task('scss', function() {
    const name = 'webplayer.css';

    return gulp.src('./webplayer.scss')
        .pipe(sass())
        .pipe(postcss([
            base64({
              extensions: ['.svg', '.png']
            })
        ]))
        .on("error", notify.onError({
            message: "Error: <%= error.message %>",
            title: "Sass Error"
        }))
        .pipe(autoprefixer({
                    browsers: ['last 10 versions'],
                    cascade: false
                }))
        .pipe(rename(name))
        .pipe(gulp.dest('.'));
});

gulp.task('watch', function() {
    gulp.watch('./webplayer.scss', gulp.series('scss'));
});