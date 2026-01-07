# Export Compliance Information for GridTV Sports

## Overview
When submitting your app to the App Store, Apple requires information about export compliance, particularly regarding encryption usage.

## Export Compliance Questions

### 1. Does your app use encryption?
**Answer:** YES

**Explanation:** Your app uses HTTPS to communicate with web servers, which involves encryption. All iOS apps that make network requests typically use encryption.

### 2. Does your app qualify for an exemption under category 5, part 2?
**Answer:** YES

**Explanation:** Your app qualifies for the exemption because:
- It uses standard encryption from iOS frameworks (URLSession, WKWebView)
- The encryption is limited to HTTPS connections
- No custom or proprietary encryption is implemented
- The app uses encryption solely for authentication and data transport

### 3. Does your app use encryption for purposes other than authentication, digital signatures, or decryption of data?
**Answer:** NO

**Explanation:** The app only uses encryption for:
- HTTPS connections (authentication and secure data transport)
- User authentication
- Protecting data in transit

### 4. Does your app implement any encryption algorithms that are proprietary or not accepted as standard by international standards bodies?
**Answer:** NO

**Explanation:** The app relies entirely on Apple's built-in encryption libraries and standard HTTPS/TLS protocols.

## Additional Information

### What encryption does the app use?
The app uses:
- **HTTPS/TLS:** For all network communications via WKWebView and URLSession
- **iOS System Encryption:** Standard iOS security features
- **No Custom Encryption:** No proprietary or custom encryption algorithms

### Do you need to submit annual reports to the U.S. government?
**Most likely NO** - If your app only uses standard encryption as described above and qualifies for the exemption, you typically do not need to submit annual self-classification reports to the U.S. Bureau of Industry and Security (BIS).

However, you should:
1. Review the current BIS regulations at www.bis.doc.gov
2. Consult with legal counsel if you're uncertain
3. Keep records of your export compliance determinations

## Info.plist Configuration

To streamline the App Store submission process, you can add the following keys to your Info.plist:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

**OR** if you want to be more explicit:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<true/>
<key>ITSEncryptionExportComplianceCode</key>
<string>Your ERN/CCATS number if you have one</string>
```

### Recommended Approach
For most apps like GridTV Sports that only use standard HTTPS encryption:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

This indicates that your app:
- Uses encryption (HTTPS), but
- Qualifies for an exemption and
- Does not require additional review

## App Store Connect Submission Flow

When uploading your app through Xcode or Transporter:

1. **If Info.plist does NOT have ITSAppUsesNonExemptEncryption:**
   - You'll be asked about encryption in App Store Connect
   - Answer the questions as outlined above
   - This needs to be done for each version

2. **If Info.plist DOES have ITSAppUsesNonExemptEncryption set to false:**
   - The export compliance process is automatically handled
   - You won't be prompted for additional information
   - Faster submission process

## Recommendation

**Add this to your Info.plist file:**

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

This will:
- ✅ Speed up your App Store submission
- ✅ Avoid manual questions each time
- ✅ Be appropriate for standard HTTPS usage
- ✅ Comply with export regulations

## Important Notes

1. **Review Your Specific Case:** If your app implements ANY custom encryption beyond standard HTTPS, you may need different answers.

2. **Keep Documentation:** Save this document and any compliance decisions for your records.

3. **Update if App Changes:** If you add custom encryption features in the future, revisit this assessment.

4. **Legal Advice:** When in doubt, consult with a legal expert familiar with U.S. export regulations.

## References

- Apple Documentation: https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations
- U.S. Bureau of Industry and Security: https://www.bis.doc.gov
- App Store Connect Help: https://help.apple.com/app-store-connect/

---

**Last Updated:** January 6, 2026
