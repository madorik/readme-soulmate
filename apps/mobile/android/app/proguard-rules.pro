# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor 플러그인 어노테이션(@CapacitorPlugin·@Permission)을 실행 중에 읽는다. R8 전체 모드에서 어노테이션이 지워지면
# 권한 요청이 옛 방식으로 빠져 앱이 죽는다(말로 적기 음성 인식에서 확인). 어노테이션과 플러그인 클래스를 남긴다
-keepattributes *Annotation*,RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep class com.getcapacitor.community.speechrecognition.** { *; }
