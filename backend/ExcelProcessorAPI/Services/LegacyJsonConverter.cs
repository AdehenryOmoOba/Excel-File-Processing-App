using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Text.Json;

namespace ExcelProcessorAPI.Services
{
    /// <summary>
    /// Custom JSON converter to handle legacy JsonElement data stored with System.Text.Json
    /// and properly convert it to usable values
    /// </summary>
    public static class LegacyDataConverter
    {
        /// <summary>
        /// Converts legacy JsonElement data to proper Dictionary<string, object>
        /// </summary>
        /// <param name="jsonString">JSON string that might contain legacy JsonElement format</param>
        /// <returns>Properly formatted dictionary</returns>
        public static Dictionary<string, object> ConvertLegacyData(string jsonString)
        {
            try
            {
                var jObject = JObject.Parse(jsonString);
                var result = new Dictionary<string, object>();

                foreach (var property in jObject.Properties())
                {
                    var value = ConvertLegacyValue(property.Value);
                    result[property.Name] = value;
                }

                return result;
            }
            catch
            {
                // If parsing fails, return empty dictionary
                return new Dictionary<string, object>();
            }
        }

        /// <summary>
        /// Converts a legacy JsonElement value to a proper object
        /// </summary>
        /// <param name="token">JToken that might contain legacy JsonElement format</param>
        /// <returns>Converted value</returns>
        private static object ConvertLegacyValue(JToken token)
        {
            // Check if this is a legacy JsonElement object
            if (token.Type == JTokenType.Object && token["ValueKind"] != null)
            {
                var valueKind = token["ValueKind"]?.Value<int>();
                
                // ValueKind values from System.Text.Json.JsonValueKind enum:
                // 0 = Undefined, 1 = Object, 2 = Array, 3 = String, 4 = Number, 5 = True, 6 = False, 7 = Null
                switch (valueKind)
                {
                    case 3: // String - but the actual string value is missing in legacy data
                        // Check if there's a Value property with actual string content
                        var stringValue = token["Value"]?.Value<string>();
                        // If no value or empty string, return 'N/A' to match frontend expectations
                        return !string.IsNullOrEmpty(stringValue) ? stringValue : "N/A";
                    case 4: // Number
                        return token["Value"]?.Value<double>() ?? 0;
                    case 5: // True
                        return true;
                    case 6: // False
                        return false;
                    case 7: // Null
                        return "N/A"; // Convert null to N/A to match frontend
                    case 0: // Undefined
                    default:
                        return "N/A"; // Convert undefined to N/A
                }
            }
            
            // If it's not a legacy JsonElement, return the value as-is
            switch (token.Type)
            {
                case JTokenType.String:
                    return token.Value<string>() ?? "";
                case JTokenType.Integer:
                    return token.Value<long>();
                case JTokenType.Float:
                    return token.Value<double>();
                case JTokenType.Boolean:
                    return token.Value<bool>();
                case JTokenType.Null:
                    return null;
                default:
                    return token.ToString() ?? "N/A";
            }
        }
    }
}