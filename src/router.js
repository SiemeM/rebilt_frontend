import { createRouter, createWebHistory } from "vue-router";
import Login from "./views/LoginPage.vue";
import ForgotPassword from "./views/ForgotPassword.vue";
import VerificationCode from "./views/VerificationCode.vue";
import NewPassword from "./views/NewPassword.vue";
import Collections from "./views/Collections.vue";
import DetailsProduct from "./views/DetailsProduct2.vue";
import Home from "./views/admin/HomePage.vue";
import AddNewProduct from "./views/admin/AddNewProductPage.vue";
import EditProduct from "./views/admin/EditProduct.vue";
import Partners from "./views/admin/PartnersPage.vue";
import AddNewPartner from "./views/admin/AddNewPartnerPage.vue";
import EditPartner from "./views/admin/EditPartner.vue";
import Orders from "./views/admin/OrdersPage.vue";
import EditOrder from "./views/admin/EditOrder.vue";
import Styling from "./views/admin/StylingPage.vue";
import Users from "./views/admin/UsersPage.vue";
import AddNewUser from "./views/admin/AddNewUserPage.vue";
import EditUser from "./views/admin/EditUser.vue";
import Settings from "./views/admin/SettingsPage.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Collections",
      component: Collections,
    },
    {
      path: "/product/:productId",
      name: "DetailsProduct",
      component: DetailsProduct,
    },
    {
      path: "/login",
      name: "Login",
      component: Login,
    },
    {
      path: "/forgotPassword",
      name: "ForgotPassword",
      component: ForgotPassword,
    },
    {
      path: "/verificationCode",
      name: "VerificationCode",
      component: VerificationCode,
    },
    {
      path: "/newPassword",
      name: "NewPassword",
      component: NewPassword,
    },
    {
      path: "/admin",
      name: "Home",
      component: Home,
    },
    {
      path: "/admin/add-new-product",
      name: "AddNewProduct",
      component: AddNewProduct,
    },
    {
      path: "/admin/edit-product/:id",
      name: "EditProduct",
      component: EditProduct,
    },
    {
      path: "/admin/partners",
      name: "Partners",
      component: Partners,
    },
    {
      path: "/admin/add-new-partner",
      name: "AddNewPartner",
      component: AddNewPartner,
    },
    {
      path: "/admin/edit-partner/:id",
      name: "EditPartner",
      component: EditPartner,
    },
    {
      path: "/admin/orders",
      name: "Orders",
      component: Orders,
    },
    {
      path: "/admin/edit-order/:id",
      name: "EditOrder",
      component: EditOrder,
    },
    {
      path: "/admin/styling",
      name: "Styling",
      component: Styling,
    },
    {
      path: "/admin/users",
      name: "Users",
      component: Users,
    },
    {
      path: "/admin/edit-user/:id",
      name: "EditUser",
      component: EditUser,
    },
    {
      path: "/admin/addNewUserPage",
      name: "addNewUserPage",
      component: AddNewUser,
    },
    {
      path: "/admin/editUser/:id",
      name: "editUser",
      component: EditUser,
    },
    {
      path: "/admin/settings",
      name: "Settings",
      component: Settings,
    },
  ],
});
