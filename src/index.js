import { PropertyKey, addPropertyKeyToArray } from './propertykey'

export const findDuplicatedProperties = (content) => {
  if (isValidJSON(content)) {
    return checkRedundancy(content)
  } else {
    throw new Error(`Input is no valid JSON file.`)
  }
}

const checkRedundancy = (content) => {
  let formattedContent = initContent(content)
  let keyValuePairs = extractKeyValuePairsOfContent(formattedContent)
  let propertyKeys = []

  keyValuePairs.map(keyValue => keyValue.key).forEach(propertyKey => {
    addPropertyKeyToArray(propertyKeys, propertyKey)
  })

  return propertyKeys.filter(propertyKey => propertyKey.occurrence > 1)
}

const initContent = (content) => {
  return content.trim()
}

const extractKeyValuePairsOfContent = (content) => {
  let parentStack = [PropertyKey(`<instance>`, null)]
  for (let i = 0; i < content.length; i++) {
    let currentChar = content.charAt(i)
    if (currentChar === '{') {
      return extractKeyValuePairsOfObject(content, parentStack, i + 1).keyValuePairs
    } else if (currentChar === '[') {
      return extractKeyValuePairsOfArray(content, parentStack, i + 1).keyValuePairs
    }
  }
}

const extractKeyValuePairsOfObject = (content, parentStack, startIndex) => {
  let currentPropertyKey
  let keyValuePairs = []
  for (let i = startIndex; i < content.length; i++) {
    let currentChar = content.charAt(i)
    if (currentChar.trim() !== ``) {
      if (currentChar === '{' && currentPropertyKey !== undefined) {
        parentStack.push(currentPropertyKey.propertyKey)
        keyValuePairs.push({ key: currentPropertyKey.propertyKey, value: `{` })
        let extractedKeyValuePairs = extractKeyValuePairsOfObject(content, parentStack, i + 1)
        i = extractedKeyValuePairs.newIndex
        keyValuePairs = keyValuePairs.concat(extractedKeyValuePairs.keyValuePairs)
        currentPropertyKey = undefined
        parentStack.pop()
      } else if (currentChar === '}') {
        return { keyValuePairs: keyValuePairs, newIndex: i }
      } else if (currentChar === '[') {
        parentStack.push(currentPropertyKey.propertyKey)
        keyValuePairs.push({ key: currentPropertyKey.propertyKey, value: `[` })
        let extractedKeyValuePairs = extractKeyValuePairsOfArray(content, parentStack, i + 1)
        i = extractedKeyValuePairs.newIndex
        keyValuePairs = keyValuePairs.concat(extractedKeyValuePairs.keyValuePairs)
        currentPropertyKey = undefined
      } else if (currentChar === ']') {
        parentStack.pop()
      } else {
        if (currentPropertyKey === undefined) {
          currentPropertyKey = extractPropertyKey(content, parentStack, i)
          i = currentPropertyKey.newIndex
        } else {
          let extractedPropertyValue = extractPropertyValue(content, i)
          keyValuePairs.push({ key: currentPropertyKey.propertyKey, value: extractedPropertyValue.propertyValue })
          i = extractedPropertyValue.newIndex
          currentPropertyKey = undefined
        }
      }
    }
  }
}

const extractKeyValuePairsOfArray = (content, parentStack, startIndex) => {
  let currentIndex = 0
  let currentKey = PropertyKey(`[${currentIndex}]`, parentStack[parentStack.length - 1])
  parentStack.push(currentKey)
  let keyValuePairs = []
  for (let i = startIndex; i < content.length; i++) {
    let currentChar = content.charAt(i)
    if (currentChar.trim() !== ``) {
      if (currentChar === `,`) {
        parentStack.pop()
        currentIndex++
        currentKey = PropertyKey(`[${currentIndex}]`, parentStack[parentStack.length - 1])
        parentStack.push(currentKey)
      } else if (currentChar === `{`) {
        let extractedKeyValuePairs = extractKeyValuePairsOfObject(content, parentStack, i + 1)
        i = extractedKeyValuePairs.newIndex
        keyValuePairs = keyValuePairs.concat(extractedKeyValuePairs.keyValuePairs)

      } else if (currentChar === `[`) {
        let extractedKeyValuePairs = extractKeyValuePairsOfArray(content, parentStack, i + 1)
        i = extractedKeyValuePairs.newIndex
        keyValuePairs = keyValuePairs.concat(extractedKeyValuePairs.keyValuePairs)
      } else if (currentChar === `]`) {
        parentStack.pop()
        return { keyValuePairs: keyValuePairs, newIndex: i - 1 }
      } else {
        let extractedPropertyValue = extractPropertyValue(content, i)
        keyValuePairs.push({ key: parentStack[parentStack.length - 1], value: extractedPropertyValue.propertyValue })
        i = extractedPropertyValue.newIndex
      }
    }
  }
}

const extractPropertyKey = (content, parentStack, startIndex) => {
  let quotationMarksFound = 0
  let isEscaped = false
  let startPropertyKeyIndex
  for (let i = startIndex; i < content.length; i++) {
    let currentChar = content.charAt(i)
    if (currentChar === `\\`) {
      isEscaped = !isEscaped
    } else {
      if (currentChar === `"` && !isEscaped) {
        quotationMarksFound++
        if (startPropertyKeyIndex === undefined) {
          startPropertyKeyIndex = i
        }
      } else {
        if (quotationMarksFound === 2) {
          if (currentChar === `:`) {
            let newSubStringEnding = i + 1
            return { propertyKey: PropertyKey(formatKey(content.substring(startPropertyKeyIndex, newSubStringEnding)), parentStack[parentStack.length - 1]), newIndex: i }
          }
        }
      }
      isEscaped = false
    }
  }
}

const extractPropertyValue = (content, startIndex) => {
  let evenAmountOfQuotationMarks = true
  let isEscaped = false
  for (let i = startIndex; i < content.length; i++) {
    let currentChar = content.charAt(i)
    if (currentChar === `\\`) {
      isEscaped = !isEscaped
    } else {
      if (currentChar === `"` && !isEscaped) {
        evenAmountOfQuotationMarks = !evenAmountOfQuotationMarks
      } else {
        if ((currentChar === `,` || currentChar === `}` || currentChar === `]`) && evenAmountOfQuotationMarks) {
          let newSubStringEnding = i
          return { propertyValue: content.substring(startIndex, newSubStringEnding).trim(), newIndex: i - 1 }
        }
        isEscaped = false
      }
    }
  }
}

const formatKey = (unformattedKey) => {
  let trimmedKey = unformattedKey.trim()
  if (trimmedKey.startsWith(`"`) && trimmedKey.endsWith(`":`)) {
    let formattedKey = trimmedKey.substring(1, trimmedKey.length - 2)
    return formattedKey
  } else {
    throw new Error(`Key ${unformattedKey} is not wrapped by ""`)
  }
}

const isValidJSON = (content) => {
  try {
    JSON.parse(content)
  } catch (err) {
    return false
  }
  return true
}
