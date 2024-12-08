<script setup>
import { ref, reactive, onMounted, watch, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";

// Router setup
const router = useRouter();

// Reactive user object to store user details (gebruik reactive voor betere reactiviteit)
const user = reactive({
  firstName: "",
  lastName: "",
  email: "",
  newEmail: "",
  oldEmail: "",
  password: "",
  newPassword: "",
  oldPassword: "",
  newPasswordRepeat: "",
  country: "",
  city: "",
  postalCode: "",
  profilePicture: "",
  bio: "",
  role: "",
  activeUnactive: true,
});

// Authentication and token handling
const token = localStorage.getItem("jwtToken");
if (!token) {
  router.push("/login");
}

const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
};

const tokenPayload = parseJwt(token);
const userId = tokenPayload?.userId;
const partnerId = tokenPayload?.partnerId || null;

if (!userId) {
  router.push("/login");
}

// Base URL for API calls
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://glint-backend-admin.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// State for managing the profile and other popups
const activeSection = ref("My profile");
const profileEditPopup = ref(false);
const changeEmailAddressPopup = ref(false);
const changePasswordPopup = ref(false);
const changeSubscriptionPopup = ref(false);
const deleteAccountPopup = ref(false);
const successProfileEditPopup = ref(false);
const succesEmailAddressPopup = ref(false);
const succesPasswordPopup = ref(false);

// Partner related data
const partnerPackage = ref(null);

// Method to set active section
const setActiveSection = (section) => {
  activeSection.value = section;
};

// Fetch user profile data
const fetchUserProfile = async () => {
  try {
    const response = await axios.get(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = response.data?.data?.user || {};
    // Update the user object
    user.firstName = userData.firstname || "";
    user.lastName = userData.lastname || "";
    user.email = userData.email || "";
    user.oldEmail = userData.email || "";
    user.country = userData.country || "";
    user.city = userData.city || "";
    user.postalCode = userData.postalCode || "";
    user.profilePicture = userData.profilePicture || "";
    user.bio = userData.bio || "";
    user.role = userData.role || "";
    user.activeUnactive = userData.activeUnactive ?? true;
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};

// Fetch partner data (if applicable)
const fetchPartnerData = async () => {
  if (!partnerId) return;

  try {
    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const partner = response.data?.data?.partner || {};
    partnerPackage.value = partner.package || "No package available";
  } catch (error) {
    console.error("Error fetching partner data:", error);
    partnerPackage.value = "Error loading partner data";
  }
};

// Update user profile
const updateProfile = async () => {
  try {
    if (!user.firstName || !user.lastName || !user.email) {
      throw new Error("First Name, Last Name, and Email are required fields.");
    }

    const response = await axios.put(
      `${baseURL}/users/${userId}`,
      {
        user: {
          firstname: user.firstName,
          lastname: user.lastName,
          email: user.email,
          password: user.password,
          role: user.role,
          activeUnactive: user.activeUnactive,
          country: user.country,
          city: user.city,
          postalCode: user.postalCode,
          profileImage: user.profilePicture,
          bio: user.bio,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    closeProfileEditPopup();
    opensuccessProfileEditPopup();
    await fetchUserProfile();
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error.response) {
      console.error("Server responded with error:", error.response.data);
    }
  }
};

// Update email address
const updateEmailAddress = async () => {
  try {
    const response = await axios.put(
      `${baseURL}/users/${userId}`,
      { user: { email: user.newEmail } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    closeChangeEmailAddressPopup();
    openSuccesChangeEmailAddressPopup();
    await fetchUserProfile();
  } catch (error) {
    console.error("Error updating email:", error);
  }
};

// Update password
const updatePassword = async () => {
  try {
    if (!user.oldPassword || !user.newPassword || !user.newPasswordRepeat) {
      throw new Error(
        "Please enter the old password, the new password, and the repetition of the new password."
      );
    }

    if (user.newPassword !== user.newPasswordRepeat) {
      throw new Error(
        "The new password and the repetition of the new password do not match."
      );
    }

    const response = await axios.put(
      `${baseURL}/users/${userId}`,
      {
        user: {
          oldPassword: user.oldPassword,
          newPassword: user.newPassword,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    closeChangePasswordPopup();
    openSuccesChangePasswordPopup();
  } catch (error) {
    console.error("Error updating password:", error);
  }
};

// Handle account deletion
const handleDeleteAccount = async () => {
  try {
    await axios.delete(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.removeItem("jwtToken");
    router.push("/login");
  } catch (error) {
    console.error("Error deleting account:", error);
  }
};

// Popup control functions
const openEditPopup = () => (profileEditPopup.value = true);
const closeProfileEditPopup = () => (profileEditPopup.value = false);

const openChangeEmailAddressPopup = () =>
  (changeEmailAddressPopup.value = true);
const closeChangeEmailAddressPopup = () =>
  (changeEmailAddressPopup.value = false);

const openChangePasswordPopup = () => (changePasswordPopup.value = true);
const closeChangePasswordPopup = () => (changePasswordPopup.value = false);

const openDeleteAccountPopup = () => (deleteAccountPopup.value = true);
const closeDeleteAccountPopup = () => (deleteAccountPopup.value = false);

// Success popups
const opensuccessProfileEditPopup = () =>
  (successProfileEditPopup.value = true);
const openSuccesChangeEmailAddressPopup = () =>
  (succesEmailAddressPopup.value = true);
const openSuccesChangePasswordPopup = () => (succesPasswordPopup.value = true);

const closeSuccessProfileEditPopup = () =>
  (successProfileEditPopup.value = false);
const closeSuccessEmailAddressPopup = () =>
  (succesEmailAddressPopup.value = false);
const closeSuccessChangePasswordPopup = () =>
  (succesPasswordPopup.value = false);

// Fetch initial data on mount
onMounted(async () => {
  await fetchUserProfile();
  await fetchPartnerData();
});

// Provide the user data to all components (including Navigation)
provide("user", user); // Makes user data available to child components like Navigation

// Watch for changes in user data and update the Navigation component
watch(
  user,
  (newUser) => {
    console.log("User data updated:", newUser);
  },
  { deep: true }
);
</script>

<template>
  <Navigation />
  <div class="content">
    <h1>Settings</h1>
    <div class="elements">
      <div class="menu">
        <p
          :class="{ active: activeSection === 'My profile' }"
          @click="setActiveSection('My profile')"
        >
          My profile
        </p>
        <p
          :class="{ active: activeSection === 'Login settings' }"
          @click="setActiveSection('Login settings')"
        >
          Login settings
        </p>
        <p
          :class="{ active: activeSection === 'Field names' }"
          @click="setActiveSection('Field names')"
        >
          Field names
        </p>
        <p
          v-if="user.role === 'partner_admin' && partnerPackage"
          :class="{ active: activeSection === 'Subscription' }"
          @click="setActiveSection('Subscription')"
          role="button"
          tabindex="0"
        >
          Subscription
        </p>
      </div>

      <div v-if="activeSection === 'My profile'" class="myProfile">
        <div class="row">
          <h2 class="border">My profile</h2>
          <button @click="openEditPopup" class="btn">
            <img src="../../assets/icons/paintbrush.svg" alt="icon" />
            <p>Edit</p>
          </button>
        </div>
        <div class="info">
          <div class="pictureWithText">
            <div class="profilePicture"></div>
            <div>
              <h3>{{ user.firstName }} {{ user.lastName }}</h3>
              <p>{{ user.bio ? user.bio : user.role }}</p>
            </div>
          </div>
        </div>

        <div class="personalInformation">
          <h3>Personal Information</h3>
          <div class="fields">
            <div class="column">
              <label>First name</label>
              <p>{{ user.firstName }}</p>
            </div>
            <div class="column">
              <label>Last name</label>
              <p>{{ user.lastName }}</p>
            </div>
            <div class="column">
              <label>Email address</label>
              <p>{{ user.email }}</p>
            </div>
          </div>
        </div>

        <div class="address">
          <h3>Address</h3>
          <div class="fields">
            <div class="column">
              <label>Country</label>
              <p>{{ user.country }}</p>
            </div>
            <div class="column">
              <label>City</label>
              <p>{{ user.city }}</p>
            </div>
            <div class="column">
              <label>Postal code</label>
              <p>{{ user.postalCode }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeSection === 'Login settings'" class="account">
        <h2 class="border">Account</h2>
        <div class="accountElements">
          <div class="column">
            <h3>Change email</h3>
            <div class="row">
              <p>{{ user.email }}</p>
              <button @click="openChangeEmailAddressPopup" class="link">
                <p>Change email</p>
              </button>
            </div>
          </div>
          <div class="column">
            <h3>Change password</h3>
            <div class="row">
              <p>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</p>
              <button @click="openChangePasswordPopup" class="link">
                <p>Change password</p>
              </button>
            </div>
          </div>
          <div class="column">
            <div class="row">
              <h3>Delete account</h3>
              <button @click="openDeleteAccountPopup" class="deletelink">
                <p>Delete account</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeSection === 'Field names'" class="fieldNames">
        <h2 class="border">Field names</h2>
        <p>Dit zijn de velden van de database.</p>
      </div>

      <div
        v-if="activeSection === 'Subscription' && user.role === 'partner_admin'"
        class="subscription"
      >
        <h2 class="border">Subscription</h2>
        <div class="subscriptionElements">
          <div class="column" v-if="partnerPackage">
            <h3>Package</h3>
            <div class="row">
              <p>{{ partnerPackage }}</p>
              <button @click="openChangeSubscriptionPopup" class="link">
                <p>Change subscription</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="profileEditPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeProfileEditPopup">&times;</span>
            <h2>Edit Profile</h2>
          </div>
          <div class="fields">
            <div class="row">
              <div class="column">
                <label>First name</label>
                <input v-model="user.firstName" placeholder="Voornaam" />
              </div>
              <div class="column">
                <label>Last name</label>
                <input v-model="user.lastName" placeholder="Achternaam" />
              </div>
            </div>
            <div class="row">
              <div class="column">
                <label>Email address</label>
                <input v-model="user.email" placeholder="E-mail" />
              </div>
              <div class="column">
                <label>Country</label>
                <input v-model="user.country" placeholder="Land" />
              </div>
            </div>
            <div class="row">
              <div class="column">
                <label>City</label>
                <input v-model="user.city" placeholder="Stad" />
              </div>
              <div class="column">
                <label>Postal code</label>
                <input v-model="user.postalCode" placeholder="Postcode" />
              </div>
            </div>
            <div class="column">
              <label>Profile Picture URL</label>
              <input
                v-model="user.profilePicture"
                placeholder="URL voor profielfoto"
              />
            </div>
            <div class="column">
              <label>Bio</label>
              <textarea v-model="user.bio" placeholder="Bio"></textarea>
            </div>
            <button @click="updateProfile" class="btn">Save</button>
          </div>
        </div>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="changeEmailAddressPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeChangeEmailAddressPopup"
              >&times;</span
            >
            <h2>Change Email Address</h2>
          </div>
          <div class="fields">
            <div class="column">
              <label>Old Email Address</label>
              <p>{{ user.email }}</p>
            </div>
            <div class="column">
              <label>New Email Address</label>
              <input v-model="user.newEmail" placeholder="example@mail.be" />
            </div>
            <button @click="updateEmailAddress" class="btn">Save</button>
          </div>
        </div>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="changePasswordPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeChangePasswordPopup">&times;</span>
            <h2>Change Password</h2>
          </div>
          <div class="fields">
            <div class="column">
              <label>Old password</label>
              <input
                v-model="user.oldpassword"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div class="column">
              <label>New password</label>
              <input
                v-model="user.newpassword"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div class="column">
              <label>Repeat new password</label>
              <input
                type="password"
                v-model="user.newPasswordRepeat"
                placeholder="••••••••"
              />
            </div>
            <p class="errorMessage"></p>
          </div>
          <button
            class="btn"
            @click="updatePassword(user.oldpassword, user.newpassword)"
          >
            Save
          </button>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="changeSubscriptionPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeChangeSubscriptionPopup"
              >&times;</span
            >
            <h2>Change Subscription</h2>
          </div>
          <div class="fields">
            <div class="column">
              <label>Package</label>
              <select v-model="selectedPackage">
                <option
                  value="standard"
                  :selected="selectedPackage === 'standard'"
                >
                  Standard
                </option>
                <option value="pro" :selected="selectedPackage === 'pro'">
                  Pro
                </option>
              </select>
            </div>
            <p class="errorMessage">{{ errorMessage }}</p>
          </div>
          <button class="btn" @click="updateSubscription">Save</button>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="deleteAccountPopup" class="deletePopup">
        <img src="../../assets/icons/cross-circle.svg" alt="icon" />
        <div class="text">
          <h2>Are you sure?</h2>
          <p>Do you really want to delete your account?</p>
          <div class="btns">
            <button @click="closeDeleteAccountPopup">Cancel</button>
            <button @click="handleDeleteAccount" class="btn active">
              Delete
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="successProfileEditPopup" class="popup">
        <div class="successpopup">
          <img src="../../assets/icons/check-circle.svg" alt="icon" />
          <div class="text">
            <div>
              <h2>Succesfully!</h2>
              <p>Your profile has been edited successfully.</p>
            </div>
            <button @click="closeSuccessProfileEditPopup" class="btn active">
              OK
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="succesEmailAddressPopup" class="popup">
        <div class="successpopup">
          <img src="../../assets/icons/check-circle.svg" alt="icon" />
          <div class="text">
            <div>
              <h2>Succesfully!</h2>
              <p>Your e-mail address has been changed.</p>
            </div>
            <button @click="closeSuccessEmailAddressPopup" class="btn active">
              OK
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="succesPasswordPopup" class="popup">
        <div class="successpopup">
          <img src="../../assets/icons/check-circle.svg" alt="icon" />
          <div class="text">
            <div>
              <h2>Succesfully!</h2>
              <p>Your password has been changed.</p>
            </div>
            <button @click="closeSuccessPasswordPopup" class="btn active">
              OK
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.elements {
  background-color: #1d1d1d;
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 24px;
  padding: 24px;
  border-radius: 8px;
}

.elements .menu {
  padding-right: 24px;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 200px;
}

.elements .menu p {
  padding-left: 24px;
}

.elements .menu p.active {
  background-color: var(--purple);
  padding: 4px 12px 4px 24px;
  border-radius: 8px;
  color: var(--white);
}

.elements .myProfile {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.elements .account {
  width: 100%;
}

.elements .myProfile .info {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
}

.elements .myProfile .info .pictureWithText {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

.elements .myProfile .info .pictureWithText .profilePicture {
  background-image: url("../../assets/images/Odette_lunettes.webp");
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.elements .myProfile .info .pictureWithText div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info,
.personalInformation,
.address {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.personalInformation,
.address {
  align-items: flex-start;
}

.myProfile .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.fieldNames,
.account,
.subscription {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.account .accountElements,
.subscription .subscriptionElements {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.account .accountElements .column,
.subscription .subscriptionElements .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account .accountElements .column .row,
.subscription .subscriptionElements .column .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.account .accountElements .column .row .link,
.subscription .subscriptionElements .column .row .link {
  background-color: var(--gray);
  border-radius: 8px;
  padding: 4px 12px;
}

.account .accountElements .column .row .link p,
.subscription .subscriptionElements .column .row .link p {
  color: var(--black);
  font-weight: 400;
}

.account .accountElements .column .row .deletelink {
  border: 1px solid #d34848;
  background-color: rgba(211, 72, 72, 0.2);
  border-radius: 8px;
  padding: 4px 12px;
}

.account .accountElements .column .row .deletelink p {
  color: #d34848;
}

.fields,
.fieldNames .list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 120px;
  row-gap: 16px;
}

.fieldNames .list {
  padding: 16px 0;
}

.fields .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column p,
input,
textarea {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
}

input,
textarea {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 4px 8px;
}

textarea {
  background-color: transparent;
  padding: 8px;
  height: 100px;
}

input,
textarea {
  width: 100%;
}

.elements .display {
  display: none;
}

.popup {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.successpopup {
  background-color: #1d1d1d;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 8px;
}

.successpopup .text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}

.successpopup .text .btn {
  color: var(--white);
}

.successpopup .text div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.popup-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  position: relative;
  align-items: flex-end;
}

.close {
  position: absolute;
  top: 10px;
  right: 15px;
  cursor: pointer;
}

.popup {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background-color: #1d1d1d;
  padding: 24px;
  border-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.popup-content .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.popup-content .fields {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  width: 100%;
}

.popup-content .row span {
  font-size: 24px;
}

.popup-content .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.popup-content .btns {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.popup-content .btns .btn {
  color: var(--white);
}

button {
  background-color: transparent;
}

.deletePopup {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background-color: #1a1a1a;
  padding: 24px 32px;
  border-radius: 8px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.deletePopup img {
  width: 64px;
  height: 64px;
}

.deletePopup .text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.deletePopup .text .btns {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.deletePopup .text .btns button {
  color: rgba(255, 255, 255, 0.6);
  border: none;
  background: transparent;
  cursor: pointer;
}

.deletePopup .text .btns .active {
  background-color: #d34848;
  color: var(--white);
}

.btn.display {
  visibility: hidden;
  border: 1px solid #d34848;
  background-color: rgba(211, 72, 72, 0.2);
  border-radius: 8px;
  padding: 4px 12px;
}

.btn.display p,
.errorMessage {
  color: #d34848;
}
</style>
