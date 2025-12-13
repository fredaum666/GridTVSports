import SwiftUI

struct ContentView: View {
    @State private var isLoading = true
    @State private var hasError = false

    private let tvReceiverURL = "https://gridtvsports.com/tv-receiver.html"

    var body: some View {
        ZStack {
            // WebView
            WebView(
                url: URL(string: tvReceiverURL)!,
                isLoading: $isLoading,
                hasError: $hasError
            )
            .edgesIgnoringSafeArea(.all)

            // Loading overlay
            if isLoading {
                LoadingView()
            }

            // Error overlay
            if hasError {
                ErrorView(onRetry: {
                    hasError = false
                    isLoading = true
                })
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color(red: 0.04, green: 0.055, blue: 0.1)
                .edgesIgnoringSafeArea(.all)

            VStack(spacing: 30) {
                Text("GridTV Sports")
                    .font(.system(size: 60, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(red: 0.39, green: 0.4, blue: 0.95),
                                     Color(red: 0.55, green: 0.36, blue: 0.96)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("Loading...")
                    .font(.title2)
                    .foregroundColor(.gray)

                ProgressView()
                    .scaleEffect(2)
                    .tint(Color(red: 0.39, green: 0.4, blue: 0.95))
            }
        }
    }
}

struct ErrorView: View {
    let onRetry: () -> Void

    var body: some View {
        ZStack {
            Color(red: 0.04, green: 0.055, blue: 0.1)
                .edgesIgnoringSafeArea(.all)

            VStack(spacing: 30) {
                Text("GridTV Sports")
                    .font(.system(size: 60, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(red: 0.39, green: 0.4, blue: 0.95),
                                     Color(red: 0.55, green: 0.36, blue: 0.96)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("Connection Failed")
                    .font(.title)
                    .foregroundColor(.red)

                Text("Please check your internet connection")
                    .font(.title3)
                    .foregroundColor(.gray)

                Button(action: onRetry) {
                    Text("Retry")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 60)
                        .padding(.vertical, 20)
                        .background(Color(red: 0.39, green: 0.4, blue: 0.95))
                        .cornerRadius(12)
                }
                .buttonStyle(.card)
            }
        }
    }
}

#Preview {
    ContentView()
}
