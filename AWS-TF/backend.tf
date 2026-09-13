terraform {
  backend "s3" {
    bucket = "tf-backend-bucket-11112222"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
    encrypt= true
    use_lockfile=true
  }
}