# XLint ([Brackets](https://github.com/adobe/brackets) extension)#

XLint is a tool that reports compatibility issues of your HTML5
application, helping you to avoid majority of cross-platform complatibility
issues at development time.

Configuration
=============
You can configure XLint behaviour by means of a JSON file **.xlintrc** in your
project's root directory. Here is an example:

    {
      "ignorePlatforms": ["android-2.3"],
      "ignoreProperty": ["display"]
    }

This tells XLint to ignore compatibility issues on Android/2.3 platform and
ignore compatibility issues related to "display" CSS property.

XLint currently support the following platforms:
  > * Android v.2.3
  > * Android v.4.0
  > * Android v.4.1
  > * Android v.4.2
  > * Android v.4.3
  > * iOS v.6
  > * iOS v.7

* **ignore platforms**.

If you want to ignore certain target platforms, you can configure it in .xlintrc
file. Note the format, it must be the platform's name, e.g. android (case
insensitive), optionally followed by dash (-) and the version number.

For example, to ignore all Android platforms:

        {
          "ignorePlatforms": ["android"],
          ...
        }

To Android 4 platforms (4.0/4.1/4.2/4.3):

        {
          "ignorePlatforms": ["android-4"],
          ...
        }

* **ignore css property**.

If you don't want XLint to check some CSS properties project-wide, you can
configure it in .xlintrc file.

        {
          "ignoreProperty": ["display", "border-image"],
          ...
        }

In-code options
===============

In addition to using configuration file you can configure XLint directly in
your source files by using special comments. For example:

  	1     /*xlint.ignoreProperty display, flex*/  
  	2     body {  
  	3       max-width: 800px;
  	4       margin: auto;
  	5     }
  	6
  	7     header {
  	8       /*xlint.ignoreRule*/
  	9       border-image: url(test.png);
 	10     }
 	11
 	12     .articles article {
 	13       /*xlint.ignoreProperty order*/
 	14       padding: 0 2.5%;
 	15       width: 33.33%;
 	16       order: 2;
 	17       background: #eee;
 	18       border-right: 1px solid #ccc;
	19       border-left: 1px solid #fff;
 	20     }
 	21
 	22     .wrap {
 	23       display: flex;
 	24       /*xlint.ignoreProperty 2*/
 	25       flex-wrap: wrap;
 	26       border-image: url(abc.png);
 	27     }

This will ignore properties "display" and "flex" at the global level (line 1);
will ignore any incompatibilities in "header" rule (line 8); will ignore any
problems with property "order" (line 13); and ignore properties defined on
lines 25 and 26 (line 24).


* **Ignore specific CSS properties in a file**.

Just put a comment file wide, i.e. outside any CSS rule. Properties must be
comma-separated:

        /*xlint.ignoreProperty display, flex*/
        ...

* **Ignore a CSS rule**.

Use a comment inside the rule:

        header {
          /*xlint.ignoreRule*/
          border-image: url(test.png);
        }

* **Ignore specific CSS properties inside a rule**.

Inside the rule specify the propeties to ignore:

        .articles article {
          /*xlint.ignoreProperty order, background*/
          padding: 0 2.5%;
          width: 33.33%;
          order: 2;
          background: #eee;
          border-right: 1px solid #ccc;
          border-left: 1px solid #fff;
        }

* **Ignore several following properties inside a rule**.

The comment in the example below will ignore the next 2 properties following
the comment. Not recommended to use as it can be easily overseen when
re-factoring a CSS rule and will cause unintended properties to be ignored.

        .wrap {
          display: flex;
          /*xlint.ignoreProperty 2*/
          flex-wrap: wrap;
          border-image: url(abc.png);
        }

If you don't specify a number, it will just ignore the next 1 property.

        .wrap {
          display: flex;
          /*xlint.ignoreProperty*/
          flex-wrap: wrap;
          border-image: url(abc.png);
        }


Compatibility data
=============
XLint relies on the compatibility data in [xlint/lib/lint/data](https://github.com/wuchengwei/brackets-xlint/tree/master/xlint/lib/lint/data) to detect compatibility issues. The compatibility data is collected via a [Test Application](https://github.com/wuchengwei/xlint-test-app).