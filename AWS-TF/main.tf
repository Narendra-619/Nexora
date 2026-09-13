module "vpc"{
  source="./modules/vpc"
  environment           = var.environment
  project               = var.project
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs= var.private_subnet_cidrs
   enable_nat_gateway    = true
   single_nat_gateway    = var.single_nat_gateway
   tags = var.tags


}

module "eks" {
  source = "./modules/eks"

  cluster_name      = "${var.environment}-${var.project}-eks"


  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  instance_types = var.eks_instance_types

  min_size     = var.eks_min_size
  max_size     = var.eks_max_size
  desired_size = var.eks_desired_size
}


