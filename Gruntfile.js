/**
 * Created by john.capehart on 1/16/2017.
 */
module.exports = function (grunt) {
  grunt.initConfig({
    pkgFile: 'package.json',
    conventionalChangelog: {
      release: {
        options: {
          changelogOpts: {
            preset: 'angular'
          }
        },
        src: 'CHANGELOG.md'
      }
    },
    conventionalGithubReleaser: {
      release: {
        options: {
          auth: {
            type: 'oauth',
            token: process.env.GH_TOKEN
          },
          changelogOpts: {
            preset: 'angular'
          }
        }
      }
    },
    bump: {
      options: {
        commitMessage: 'chore: release v%VERSION%',
        pushTo: 'origin',
        commitFiles: [
          'progressive-config.js',
          'package.json',
          'CHANGELOG.md',
          'README.md',
          'Gruntfile.js'
        ]
      }
    },
    karma: {
      adapter: {
        configFile: 'karma.conf.js',
        autoWatch: false,
        singleRun: true,
        reporters: ['dots']
      }
    },
    eslint: {
      target: [
        'progressive-config.js'
      ]
    }
  })

  require('load-grunt-tasks')(grunt)

  grunt.registerTask('test', ['karma'])
  grunt.registerTask('default', ['eslint', 'test'])

  grunt.registerTask('release', 'Bump the version and publish to NPM.', function (type) {
    grunt.task.run([
      'npm-contributors',
      'bump:' + (type || 'patch') + ':bump-only',
      'conventionalChangelog',
      'bump-commit',
      'conventionalGithubReleaser',
      'npm-publish'
    ])
  })
}
