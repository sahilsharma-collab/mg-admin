import React from "react";

import { requirePermission } from "@/lib/server/guard";

import RenewalsDataClient from "./components/client";

/**
 * Every customer's name, email, phone number, country, package and payment
 * amount, on screen and as a CSV. Until this guard existed the only thing
 * keeping an admin outside the finance group away from it was the sidebar not
 * drawing the link — typing /renewals was enough.
 *
 * The check is awaited before any markup is returned, so a refusal happens
 * instead of the page rather than over the top of it.
 */
const RenewalsPage = async () => {
  await requirePermission("revenue:read");

  return (
    <div>
      <RenewalsDataClient />
    </div>
  );
};

export default RenewalsPage;
