CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "name" varchar(64) NOT NULL,
  "color" varchar(32),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "batch_tags" (
  "batch_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "tags_user_id_idx" ON "tags" ("user_id");
CREATE UNIQUE INDEX "tags_user_name_unique_idx" ON "tags" ("user_id", "name");
CREATE INDEX "batch_tags_user_id_idx" ON "batch_tags" ("user_id");
CREATE INDEX "batch_tags_batch_id_idx" ON "batch_tags" ("batch_id");
CREATE UNIQUE INDEX "batch_tags_batch_tag_unique_idx" ON "batch_tags" ("batch_id", "tag_id");
