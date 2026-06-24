package com.example.citylife

import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.citylife.theme.CityLifeTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      CityLifeTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
          AppScreen()
        }
      }
    }
  }
}

@Composable
fun AppScreen() {
  var serverUrl by remember { mutableStateOf("https://citylife.kooker.co.za") }
  var isConnected by remember { mutableStateOf(false) }
  var tempUrl by remember { mutableStateOf(serverUrl) }
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }

  BackHandler(enabled = isConnected) {
    if (webViewInstance?.canGoBack() == true) {
      webViewInstance?.goBack()
    } else {
      isConnected = false
    }
  }

  if (!isConnected) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(32.dp),
      verticalArrangement = Arrangement.Center,
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Text(
        text = "CityLife TV Container",
        style = MaterialTheme.typography.headlineMedium,
        modifier = Modifier.padding(bottom = 24.dp)
      )
      OutlinedTextField(
        value = tempUrl,
        onValueChange = { tempUrl = it },
        label = { Text("CityLife Server URL") },
        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
        singleLine = true
      )
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        Button(
          onClick = {
            serverUrl = tempUrl
            isConnected = true
          },
          modifier = Modifier.weight(1.5f)
        ) {
          Text("Connect")
        }
        Button(
          onClick = {
            tempUrl = "https://citylife.kooker.co.za"
          },
          colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            contentColor = MaterialTheme.colorScheme.onSecondaryContainer
          ),
          modifier = Modifier.weight(1f)
        ) {
          Text("Reset Default")
        }
      }
    }
  } else {
    Box(modifier = Modifier.fillMaxSize()) {
      AndroidView(
        factory = { context ->
          WebView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
              ViewGroup.LayoutParams.MATCH_PARENT,
              ViewGroup.LayoutParams.MATCH_PARENT
            )
            webViewClient = WebViewClient()
            settings.apply {
              javaScriptEnabled = true
              domStorageEnabled = true
              databaseEnabled = true
              mediaPlaybackRequiresUserGesture = false
              mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
              useWideViewPort = true
              loadWithOverviewMode = true
            }
            loadUrl(serverUrl)
            webViewInstance = this
            
            // Peripherals integration support: request focus to capture key, mouse, and gamepad inputs
            requestFocus()
            setOnTouchListener { v, _ ->
              v.requestFocus()
              false
            }
          }
        },
        modifier = Modifier.fillMaxSize()
      )
      
      // Floating button to easily return to connection settings
      Button(
        onClick = { isConnected = false },
        modifier = Modifier
          .align(Alignment.TopEnd)
          .padding(16.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
          contentColor = MaterialTheme.colorScheme.onSurfaceVariant
        )
      ) {
        Text("Change Server")
      }
    }
  }
}

