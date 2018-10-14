const gulp = require('gulp');
const less = require('gulp-less');

gulp.task('css', function() {
  return gulp.src('src/_less/**/[^_]*.less')
    .pipe(less())
    .pipe(gulp.dest('_site/css/'));
});

gulp.task('html', function() {
  return gulp.src('src/**/*.html')
    .pipe(gulp.dest('_site'));
});

gulp.task('js', function() {
  return gulp.src('src/js/**/*.js')
    .pipe(gulp.dest('_site/js/'));
});

gulp.task('default', gulp.parallel('html', 'css', 'js'));

gulp.task('watch', function() {
  gulp.watch('src/**/*.html', gulp.series('html'));
  gulp.watch('src/js/**/*.js', gulp.series('js'));
  gulp.watch('src/_less/**/*.less', gulp.series('css'));

});

