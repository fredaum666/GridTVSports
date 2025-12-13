sub Main()
    ' Initialize the screen
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.setMessagePort(port)

    ' Create the main scene
    scene = screen.CreateScene("MainScene")
    screen.show()

    ' Event loop
    while true
        msg = wait(0, port)
        msgType = type(msg)

        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then
                return
            end if
        end if
    end while
end sub
