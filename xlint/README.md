#XLint

Make your HTML5 application really cross-platformable.<br>
XLint is a tool helping you find out compatibility issues of your HTML5 application on specific target platforms.<br>
Currently, we are on the first stage, which is checking CSS code, but we will move forward and check HTML/JS code.

##Installing
1. You need to install node and npm. See [here](http://nodejs.org).
2. Run **npm install**.

##CLI Usage
* Typical example:
> **node ./xlint.js --target-platform android/4.0 -i /path/to/your/app -o /path/to/place/report**

***NOTE:***<br>
**Only those target platforms that we have compatibility data are supported!**

* Run the tests
> **npm run-script test**

##Dependencies
- [cssom-chengwei](https://github.com/wuchengwei/CSSOM) - CSS parser
- [optimist](https://github.com/substack/node-optimist) - CLI options parser
- [progress](https://github.com/visionmedia/node-progress) - CLI progress bar
- [cli-color](https://github.com/medikoo/cli-color) - Colored console output
- [mkdirp](https://github.com/substack/node-mkdirp) - Like _mkdir -p_