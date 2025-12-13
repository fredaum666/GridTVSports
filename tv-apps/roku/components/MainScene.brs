sub init()
    m.webView = m.top.findNode("tvReceiver")
    m.loadingBg = m.top.findNode("loadingBg")
    m.loadingText = m.top.findNode("loadingText")

    ' Observe web view status
    m.webView.observeField("loadStatus", "onLoadStatusChange")

    ' Set focus to web view for remote input
    m.webView.setFocus(true)
end sub

sub onLoadStatusChange()
    loadStatus = m.webView.loadStatus

    if loadStatus = "complete"
        ' Hide loading screen
        m.loadingBg.visible = false
        m.loadingText.visible = false
    else if loadStatus = "failed"
        ' Show error message
        m.loadingText.text = "Connection failed. Press OK to retry."
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "OK" and m.webView.loadStatus = "failed"
            ' Retry loading
            m.webView.url = "https://gridtvsports.com/tv-receiver.html"
            m.loadingText.text = "Loading GridTV Sports..."
            return true
        end if
    end if
    return false
end function
