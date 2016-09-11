
var gulp = require('gulp');
var gutil = require('gulp-util');
var sass = require('gulp-sass');
var shell = require('gulp-shell');
var inject = require('gulp-inject');
var browserSync = require('browser-sync').create();

gulp.task('scss', function () {
    return gulp.src('./src/app.scss')
        .pipe(sass())
        .pipe(gulp.dest('./build/src/'))
        .pipe(browserSync.stream());
});

gulp.task('inject', function () {
    var sources = gulp.src('./src/**/*.js', {read: false});
    var inject_cfg = {addRootSlash: false};

    return gulp.src('./src/index.html')
        .pipe(inject(
            gulp.src('./src/**/*.module.js', {read: false}), 
                {addRootSlash: false, name: 'inject:modules'}))
        .pipe(inject(
            gulp.src(['./src/**/*.js', '!./src/**/*.module.js'], {read: false}), inject_cfg))
        .pipe(gulp.dest('./build/src/'));
});

gulp.task('package-metadata', function () {
    return gulp.src('./package.json').pipe(gulp.dest('./build/'));
});

gulp.task('package-bower', function () {
    return gulp.src('./bower_components/**/*').pipe(gulp.dest('./build/bower_components/'));
});

gulp.task('package', ['scss', 'inject', 'package-bower', 'package-metadata'], function () {
    return gulp.src(['./src/**/*.html', './src/**/*.js', '!./src/index.html'])
        .pipe(gulp.dest('./build/src/'))
        .pipe(browserSync.stream());
});

gulp.task('deploy', ['package'], shell.task(['echo "Deploying"', 'deploy-dev ./build']));

gulp.task('browser-sync', function () {
    browserSync.init({
        proxy: {
            target: "dev.theelectriccastle.com",
            ws: true

        }
    });
});

gulp.task('serve', function () {
    gulp.watch(['./src/**/*.js', './src/**/*.html', './src/**/*.scss'], ['deploy']);
    gulp.watch('./src/**/*.html').on('change', browserSync.reload);
});

gulp.task('sync', ['browser-sync', 'serve'], function () {
});
