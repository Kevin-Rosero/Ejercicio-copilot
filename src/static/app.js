document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityTemplate = document.getElementById("activity-template");

  // Helper: obtener iniciales a partir de nombre o email
  function getInitials(text) {
    if (!text) return "";
    // Si es email, toma la parte antes del @
    const local = text.includes("@") ? text.split("@")[0] : text;
    // Separa por espacios, puntos, guiones o guiones bajos
    const parts = local.split(/[\s._-]+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
    return initials || local.slice(0, 2).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
  // Avoid returning cached/stale responses so the UI shows updates immediately
  const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message / previous content
      activitiesList.innerHTML = "";

      // Reset select (preserve placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list using template
      Object.entries(activities).forEach(([name, details]) => {
        const clone = activityTemplate.content.cloneNode(true);

        // Fill title, description and meta
        const titleEl = clone.querySelector(".activity-title");
        const descEl = clone.querySelector(".activity-desc");
        const metaEl = clone.querySelector(".activity-meta");
        if (titleEl) titleEl.textContent = name;
        if (descEl) descEl.textContent = details.description || "";
        const spotsLeft = Math.max(0, (details.max_participants || 0) - (details.participants?.length || 0));
        if (metaEl) {
          metaEl.innerHTML = `<strong>Schedule:</strong> ${details.schedule || "TBA"} · <strong>Availability:</strong> ${spotsLeft} spots left`;
        }

        // Fill participants list
        const participantsList = clone.querySelector(".participants-list");
        if (participantsList) {
          participantsList.innerHTML = "";
          const participants = Array.isArray(details.participants) ? details.participants : [];
          if (participants.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No participants yet";
            li.style.fontStyle = "italic";
            participantsList.appendChild(li);
          } else {
            participants.forEach((p) => {
                const li = document.createElement("li");

                const badge = document.createElement("span");
                badge.className = "participant-badge";
                badge.textContent = getInitials(typeof p === "string" ? p : (p.name || p.email || ""));
                li.appendChild(badge);

                const nameSpan = document.createElement("span");
                nameSpan.className = "participant-name";
                // Si p es objeto, intenta mostrar nombre o email; si es string, mostrar directamente
                const participantEmail = typeof p === "string" ? p : (p.email || p.name || "Unknown");
                nameSpan.textContent = participantEmail;
                li.appendChild(nameSpan);

                // Botón de eliminar participante
                const deleteBtn = document.createElement("button");
                deleteBtn.className = "participant-delete";
                deleteBtn.setAttribute("aria-label", `Remove ${participantEmail} from ${name}`);
                deleteBtn.title = `Remove ${participantEmail}`;
                deleteBtn.textContent = "×";
                deleteBtn.addEventListener("click", async (ev) => {
                  ev.preventDefault();
                  try {
                    const resp = await fetch(
                      `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(participantEmail)}`,
                      { method: "DELETE" }
                    );
                    const result = await resp.json();
                    if (resp.ok) {
                      // refrescar lista de actividades para actualizar UI
                      fetchActivities();
                    } else {
                      console.error("Failed to remove participant:", result);
                    }
                  } catch (err) {
                    console.error("Error removing participant:", err);
                  }
                });

                li.appendChild(deleteBtn);

                participantsList.appendChild(li);
            });
          }
        }

        // Append the populated card
        activitiesList.appendChild(clone);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Ensure we refresh the activities data before showing success so the UI
        // reflects the new participant without requiring a full page refresh.
        try {
          await fetchActivities();
        } catch (err) {
          console.error('Error refreshing activities after signup:', err);
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
