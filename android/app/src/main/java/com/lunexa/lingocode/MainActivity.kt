package com.lunexa.lingocode

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import java.util.Locale

/**
 * LingoCode — оболочка Android вокруг веб-приложения из assets/web.
 * Страницы отдаются через WebViewAssetLoader с адреса https://appassets.androidplatform.net,
 * поэтому работают ES-модули, Web Worker и WebAssembly (Python), а данные localStorage
 * сохраняются между запусками. Интернет приложению не нужен.
 */
class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private lateinit var web: WebView
    private lateinit var root: FrameLayout
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var pendingSpeech: Pair<String, Float>? = null
    private var pendingFileText: String? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val createDoc = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val text = pendingFileText
        pendingFileText = null
        if (uri == null || text == null) return@registerForActivityResult
        try {
            contentResolver.openOutputStream(uri, "wt")?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
            jsToast("Резервная копия сохранена")
        } catch (e: Exception) {
            jsToast("Не удалось сохранить файл")
        }
    }

    private val openDoc = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        fileCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        root = FrameLayout(this)
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
        applyBars(isNight())

        // Системные панели и клавиатура не перекрывают содержимое
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
            WindowInsetsCompat.CONSUMED
        }

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", TypedAssetsHandler())
            .build()

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            textZoom = 100
            setSupportZoom(false)
        }
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.addJavascriptInterface(Bridge(), "LingoAndroid")

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.host == "appassets.androidplatform.net") return false
                // Внешние ссылки открываем в браузере, а не внутри приложения
                if (request.isForMainFrame) {
                    try { startActivity(Intent(Intent.ACTION_VIEW, url)) } catch (_: ActivityNotFoundException) {}
                }
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    openDoc.launch(arrayOf("application/json", "text/plain", "application/octet-stream", "*/*"))
                    true
                } catch (e: ActivityNotFoundException) {
                    fileCallback = null
                    false
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("(window.lcBack && window.lcBack()) ? 'yes' : 'no'") { res ->
                    if (res?.contains("yes") != true) {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })

        tts = TextToSpeech(this, this)

        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() {
        // принудительно записываем прогресс
        web.evaluateJavascript("window.lcPause && window.lcPause()", null)
        super.onPause()
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        web.destroy()
        super.onDestroy()
    }

    // ---------- Озвучка ----------
    override fun onInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) return
        val t = tts ?: return
        var r = t.setLanguage(Locale.UK)
        if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) r = t.setLanguage(Locale.US)
        if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
            runOnUiThread { web.evaluateJavascript("window.lcTtsMissing && window.lcTtsMissing()", null) }
            return
        }
        ttsReady = true
        pendingSpeech?.let { speakNow(it.first, it.second) }
        pendingSpeech = null
    }

    private fun speakNow(text: String, rate: Float) {
        val t = tts ?: return
        t.setSpeechRate(rate.coerceIn(0.3f, 2f))
        t.speak(text, TextToSpeech.QUEUE_FLUSH, null, "lc")
    }

    private fun isNight(): Boolean =
        (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES

    private fun applyBars(dark: Boolean) {
        val bg = if (dark) Color.parseColor("#141221") else Color.parseColor("#F8F7FF")
        root.setBackgroundColor(bg)
        web.setBackgroundColor(bg)
        val c = WindowCompat.getInsetsController(window, window.decorView)
        c.isAppearanceLightStatusBars = !dark
        c.isAppearanceLightNavigationBars = !dark
    }

    private fun jsToast(msg: String) {
        val safe = msg.replace("\\", "\\\\").replace("'", "\\'")
        runOnUiThread { web.evaluateJavascript("window.lcToast ? window.lcToast('$safe') : 0", null) }
    }

    /** Мост для веб-части. Вызывается из потока JavaBridge — в UI переходим явно. */
    inner class Bridge {
        @JavascriptInterface
        fun speak(text: String, rate: Float) {
            runOnUiThread {
                if (ttsReady) speakNow(text, rate) else pendingSpeech = text to rate
            }
        }

        @JavascriptInterface
        fun saveFile(name: String, mime: String, content: String) {
            runOnUiThread {
                pendingFileText = content
                try { createDoc.launch(name) } catch (e: ActivityNotFoundException) {
                    Toast.makeText(this@MainActivity, "Нет приложения для сохранения файлов", Toast.LENGTH_LONG).show()
                }
            }
        }

        @JavascriptInterface
        fun setDark(dark: Boolean) {
            runOnUiThread { applyBars(dark) }
        }
    }

    /** Отдаёт файлы из assets с правильными MIME-типами (важно для модулей JS и WebAssembly). */
    private inner class TypedAssetsHandler : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val clean = path.substringBefore('?').substringBefore('#')
            if (clean.contains("..")) return null
            return try {
                val stream = assets.open(clean)
                val ext = clean.substringAfterLast('.', "").lowercase()
                val mime = MIME[ext] ?: "application/octet-stream"
                val enc = if (mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") || mime.contains("svg")) "utf-8" else null
                WebResourceResponse(mime, enc, stream).apply {
                    responseHeaders = mapOf("Cache-Control" to "no-cache", "X-Content-Type-Options" to "nosniff")
                }
            } catch (e: Exception) {
                WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), null)
            }
        }
    }

    companion object {
        private val MIME = mapOf(
            "html" to "text/html", "js" to "text/javascript", "mjs" to "text/javascript", "css" to "text/css",
            "json" to "application/json", "webmanifest" to "application/manifest+json", "svg" to "image/svg+xml",
            "png" to "image/png", "jpg" to "image/jpeg", "jpeg" to "image/jpeg", "gif" to "image/gif", "webp" to "image/webp",
            "wasm" to "application/wasm", "zip" to "application/zip", "txt" to "text/plain", "map" to "application/json",
        )
    }
}
