# Add project specific ProGuard rules here.

# Keep all members of the WebView and its related classes
-keepclassmembers class android.webkit.WebView { *; }
-keepclassmembers class android.webkit.WebSettings { *; }
-keepclassmembers class android.webkit.WebViewClient { *; }
-keepclassmembers class android.webkit.WebChromeClient { *; }

# Keep the JavaScript interface, if you use one (replace with your actual interface class)
# -keepclassmembers class com.example.MyJavaScriptInterface { @android.webkit.JavascriptInterface <methods>; }

# Keep application classes that are referenced in the manifest
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet, int);
}

# Keep all custom view classes
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
    public void set*(...);
}

# Keep classes that are used as setters
-keepclassmembers public class * extends android.app.Activity {
   public void *(android.view.View);
}

# Keep enums
-keepclassmembers enum * { *; }

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}

# Keep R classes
-keep class **.R$* { *; }

# Keep classes that might be used by data binding
-dontwarn androidx.databinding.**
-keep class androidx.databinding.** { *; }
