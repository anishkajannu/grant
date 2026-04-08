(function () {
  const PROFILE = {
    full_name: "Anishka Jannu",
    first_name: "Anishka",
    last_name: "Jannu",
    email: "anishkajannu@gmail.com",
    phone: "5104585877",
    college: "Carnegie Mellon University"
  };

  const FIELD_MATCHERS = [
    {
      fieldKey: "email",
      value: PROFILE.email,
      aliases: ["email", "email address", "e mail"],
      autocomplete: ["email"],
      inputTypes: ["email"]
    },
    {
      fieldKey: "phone",
      value: PROFILE.phone,
      aliases: ["phone", "phone number", "telephone", "mobile", "cell"],
      autocomplete: ["tel", "tel-national"],
      inputTypes: ["tel"]
    },
    {
      fieldKey: "first_name",
      value: PROFILE.first_name,
      aliases: ["first name", "given name", "forename"],
      autocomplete: ["given-name"]
    },
    {
      fieldKey: "last_name",
      value: PROFILE.last_name,
      aliases: ["last name", "surname", "family name"],
      autocomplete: ["family-name"]
    },
    {
      fieldKey: "full_name",
      value: PROFILE.full_name,
      aliases: ["full name", "name", "your name", "applicant name", "contact name"],
      autocomplete: ["name"]
    },
    {
      fieldKey: "college",
      value: PROFILE.college,
      aliases: [
        "college",
        "college name",
        "university",
        "university name",
        "school",
        "school name",
        "institution",
        "institution name",
        "current school"
      ],
      autocomplete: ["organization", "organization-title"]
    }
  ];

  const INPUT_SELECTOR = [
    "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='checkbox']):not([type='radio'])",
    "textarea",
    "select"
  ].join(", ");

  function normalizeText(value) {
    return (value || "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none";
  }

  function getLabelText(element) {
    const parts = [];

    if (element.id) {
      document.querySelectorAll(`label[for="${CSS.escape(element.id)}"]`).forEach((label) => {
        parts.push(label.textContent || "");
      });
    }

    const wrappingLabel = element.closest("label");
    if (wrappingLabel) {
      parts.push(wrappingLabel.textContent || "");
    }

    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      parts.push(ariaLabel);
    }

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .forEach((node) => parts.push(node.textContent || ""));
    }

    const previous = element.previousElementSibling;
    if (previous) {
      parts.push(previous.textContent || "");
    }

    return normalizeText(parts.join(" "));
  }

  function getDescriptor(element) {
    return normalizeText([
      getLabelText(element),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.id,
      element.getAttribute("autocomplete"),
      element.getAttribute("data-testid")
    ].join(" "));
  }

  function buildDomPath(element) {
    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part += `#${current.id}`;
        parts.unshift(part);
        break;
      }

      if (current.classList.length) {
        part += `.${Array.from(current.classList).slice(0, 2).join(".")}`;
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.join(" > ");
  }

  function detectField(element) {
    const descriptor = getDescriptor(element);
    const autocomplete = normalizeText(element.getAttribute("autocomplete"));
    const type = normalizeText(element.getAttribute("type") || element.tagName);

    let bestMatch = null;
    let bestScore = 0;

    FIELD_MATCHERS.forEach((matcher) => {
      let score = 0;

      matcher.aliases.forEach((alias) => {
        if (descriptor.includes(normalizeText(alias))) {
          score += alias === "name" ? 0.25 : 1;
        }
      });

      (matcher.autocomplete || []).forEach((token) => {
        if (autocomplete === token) {
          score += 1.2;
        }
      });

      (matcher.inputTypes || []).forEach((inputType) => {
        if (type === inputType) {
          score += 1.2;
        }
      });

      if (matcher.fieldKey === "full_name" && (descriptor.includes("first name") || descriptor.includes("last name"))) {
        score = 0;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = matcher;
      }
    });

    return bestScore >= 1 ? bestMatch : null;
  }

  function dispatchFillEvents(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  function fillSelect(element, value) {
    const normalizedValue = normalizeText(value);
    const options = Array.from(element.options);
    const match = options.find((option) => {
      const text = normalizeText(option.textContent);
      const optionValue = normalizeText(option.value);
      return text === normalizedValue ||
        optionValue === normalizedValue ||
        text.includes(normalizedValue) ||
        normalizedValue.includes(text);
    });

    if (!match) {
      return false;
    }

    element.value = match.value;
    dispatchFillEvents(element);
    return true;
  }

  function fillElement(element, value) {
    if (element.tagName.toLowerCase() === "select") {
      return fillSelect(element, value);
    }

    setNativeValue(element, value);
    dispatchFillEvents(element);
    return true;
  }

  function scanFields() {
    const fields = [];

    document.querySelectorAll(INPUT_SELECTOR).forEach((element) => {
      if (!(element instanceof HTMLElement) || !isVisible(element) || element.disabled || element.readOnly) {
        return;
      }

      const match = detectField(element);
      if (!match) {
        return;
      }

      fields.push({
        fieldKey: match.fieldKey,
        label: getLabelText(element),
        name: element.getAttribute("name") || "",
        id: element.id || "",
        placeholder: element.getAttribute("placeholder") || "",
        path: buildDomPath(element)
      });
    });

    return fields;
  }

  function autofillFields() {
    const filled = [];
    const skipped = [];

    document.querySelectorAll(INPUT_SELECTOR).forEach((element) => {
      if (!(element instanceof HTMLElement) || !isVisible(element) || element.disabled || element.readOnly) {
        return;
      }

      const match = detectField(element);
      if (!match) {
        return;
      }

      const currentValue = element.tagName.toLowerCase() === "select"
        ? normalizeText(element.value)
        : String(element.value || "").trim();

      const summary = {
        fieldKey: match.fieldKey,
        label: getLabelText(element),
        name: element.getAttribute("name") || "",
        id: element.id || "",
        placeholder: element.getAttribute("placeholder") || "",
        path: buildDomPath(element)
      };

      if (currentValue) {
        skipped.push({
          ...summary,
          action: "already had a value"
        });
        return;
      }

      if (fillElement(element, match.value)) {
        filled.push({
          ...summary,
          resultLabel: `filled with ${match.value}`
        });
      } else {
        skipped.push({
          ...summary,
          action: "no matching option found"
        });
      }
    });

    return { filled, skipped };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "ANISHKA_AUTOFILL_SCAN") {
      sendResponse({ fields: scanFields() });
      return true;
    }

    if (message?.type === "ANISHKA_AUTOFILL_FILL") {
      sendResponse(autofillFields());
      return true;
    }

    return false;
  });
})();
