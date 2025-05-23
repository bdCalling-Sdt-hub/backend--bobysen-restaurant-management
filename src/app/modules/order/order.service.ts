import axios from "axios";
import httpStatus from "http-status";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import config from "../../config";
import AppError from "../../error/AppError";
import { Unpaidbooking } from "../booking/booking.model";
import { Cart } from "../cart/cart.model";
import { eventsServices } from "../event/event.service";
import { Wallet } from "../wallet/wallet.model";
const insertOrderIntoDb = async (payload: any) => {
  const {
    cart,
    amount: orderAmount,
    id_order,
    status,
    transaction_id,
    checksum,
    date,
  } = payload || {};
  const amount = Number(orderAmount) / 100;
  // console.log("payload from load payment zone", payload);
  //   const formatedAmount = Number(amount) / 100;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // update due
    const updateDue = await Cart.findByIdAndUpdate(
      cart,
      {
        $inc: {
          totalDue: -Number(amount),
          totalPaid: Number(amount),
        },
        $set: {
          status: "paid",
        },
        $push: {
          transactions: {
            amount,
            date,
            orderId: id_order,
            status,
            transaction_id,
            checksum,
          },
        },
      },
      { session, new: true }
    );
    if (!updateDue) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to update Data");
    }

    const result = await Wallet.findOneAndUpdate(
      { owner: updateDue?.owner },
      {
        $inc: {
          amount: Number(amount),
          due: Number(amount),
        },
      },
      { upsert: true, new: true, session }
    );
    if (!result) {
      throw new AppError(httpStatus.BAD_REQUEST, "Something went wrong");
    }

    await session.commitTransaction();
    await session.endSession();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new Error(error);
  }
};

const getImnCallback = async (received_crypted_data: any) => {
  let response;
  const obj = {
    authentify: {
      id_merchant: config.payment.id_merchant,
      id_entity: config.payment.id_entity,
      id_operator: config.payment.id_operator,
      operator_password: config.payment.operator_password,
    },
    salt: config.payment.salt,
    cipher_key: config.payment.chiper_key,
    received_crypted_data: received_crypted_data?.crypted_callback,
  };

  try {
    response = await axios.post(
      "https://api.mips.mu/api/decrypt_imn_data",
      obj,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              "datamation_8a9ft5:kqK1hvT5Mhwu7t0KavYaJctDW5M8xruW"
            ).toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );
    // check valid user for using token

    if (response?.data?.status !== "SUCCESS") {
      throw new AppError(
        httpStatus.NOT_ACCEPTABLE,
        "The transactions is failed. please contact to the customer portal."
      );
    }
    // check try catch
    const additional_param = JSON.parse(response?.data?.additional_param);

    const { token, type } = additional_param;

    let decode;
    try {
      decode = jwt.verify(
        token,
        config.jwt_access_secret as string
      ) as JwtPayload;
    } catch (err) {
      throw new AppError(httpStatus.UNAUTHORIZED, "unauthorized");
    }
    const { amount, checksum, id_order, transaction_id, payment_date } =
      response?.data;
    if (type === "order") {
      await insertOrderIntoDb({
        amount,
        checksum,
        id_order,
        transaction_id,
        date: payment_date,
        cart: additional_param?.cart,
      });
    } else if (type === "event") {
      const bookingData = await Unpaidbooking.findById(
        additional_param?.unpaidBooking
      );
      const data = {
        ...bookingData?.toObject(),
        transactionId: transaction_id,
        amount: amount,
      };
      await eventsServices.makePaymentForEvent(data);
    }
  } catch (error: any) {
    throw new Error(error);
    // Handle the error
  }
  return response?.data;
};

// load payment zone

const loadPaymentZone = async (payload: any, token: string) => {
  const { cart, user, ...others } = payload;
  const data = {
    ...others,
    additional_params: [
      {
        param_name: "token",
        param_value: token,
      },
      {
        param_name: "user",
        param_value: payload?.user,
      },
      {
        param_name: "cart",
        param_value: cart,
      },
      {
        param_name: "type",
        param_value: "order",
      },
    ],
    request_mode: "simple",
    touchpoint: "native_app",
  };
  let response;
  const headers = {
    "content-type": "application/json",
    Authorization:
      "Basic " +
      Buffer.from(
        "datamation_8a9ft5:kqK1hvT5Mhwu7t0KavYaJctDW5M8xruW"
      ).toString("base64"),
  };

  const authObj = {
    authentify: {
      id_merchant: config.payment.id_merchant,
      id_entity: config.payment.id_entity,
      id_operator: config.payment.id_operator,
      operator_password: config.payment.operator_password,
    },
  };

  try {
    response = await axios.post(
      config.payment.load_payment_zone!,
      { ...authObj, ...data },
      {
        headers: headers,
      }
    );
    // Handle the response data as needed
  } catch (error: any) {
    throw new Error(error);
    // Handle the error
  }

  return response?.data?.answer;
};

export const orderServices = {
  insertOrderIntoDb,
  getImnCallback,
  loadPaymentZone,
};
